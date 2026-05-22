import { DataSanitizationMatcher, DataSanitizationReplacer } from './types';
import {
  DEFAULT_FIELD_NAME_PATTERNS,
  DEFAULT_NUMERIC_MASK,
  DEFAULT_PATTERN_MASK,
} from './constants';
import defaultMatchers, { escapePattern } from './matchers';

const buildPatterns = (
  useDefaultPatterns: boolean,
  customPatterns?: string[],
): string[] => {
  const base = useDefaultPatterns ? [...DEFAULT_FIELD_NAME_PATTERNS] : [];
  return Array.isArray(customPatterns) ? [...base, ...customPatterns] : base;
};

const buildMatchers = (
  useDefaultMatchers: boolean,
  customMatchers?: DataSanitizationMatcher[],
): DataSanitizationMatcher[] => {
  const base = useDefaultMatchers ? [...defaultMatchers] : [];
  return Array.isArray(customMatchers) ? [...base, ...customMatchers] : base;
};

/**
 * Sanitizes a string by masking or removing sensitive data.
 *
 * This checks for some common patterns on how sensitive
 * data might appear in a string.
 *
 * NOTE: these are not meant to cover every case, but common cases
 *       care should still be taken in code to ensure only logging of
 *       safe data
 *
 * @param data - Data string to be sanitized.
 * @param options - Matcher, pattern, masking, and removal options.
 * @returns Sanitized string data, or the original non-string data for runtime safety.
 * @throws {Error} If a matcher fails while creating a regular expression for a pattern.
 *
 * @example
 * stringReplacer('password=secret&username=mark')
 * // => 'password=**********&username=mark'
 *
 * @example
 * stringReplacer('password=secret&username=mark', { removeMatches: true })
 * // => 'username=mark'
 */
const stringReplacer: DataSanitizationReplacer = (data, options = {}) => {
  const {
    customMatchers,
    customPatterns,
    patternMask,
    removeMatches = false,
    useDefaultMatchers = true,
    useDefaultPatterns = true,
  } = options;

  if (typeof data !== 'string') {
    return data;
  }

  const mask = patternMask ?? DEFAULT_PATTERN_MASK;
  const patterns = buildPatterns(useDefaultPatterns, customPatterns);
  const matchers = buildMatchers(useDefaultMatchers, customMatchers);

  for (const pattern of patterns) {
    for (const matcher of matchers) {
      const matchInstance = matcher(pattern, removeMatches);

      if (removeMatches) {
        data = data.replace(matchInstance, '');
      } else {
        data = data.replace(matchInstance, '$1' + mask + '$2');
      }
    }
  }

  return data;
};

/**
 * Sanitizes object fields by key name, masking or removing matched keys.
 *
 * @param data - Object or array data to sanitize.
 * @param options - Pattern, masking, and removal options.
 * @returns Sanitized object/array data, or the original non-object data for runtime safety.
 * @throws {TypeError} If a circular reference is encountered.
 *
 * @example
 * objectReplacer({ password: 'secret', username: 'mark' })
 * // => { password: '**********', username: 'mark' }
 *
 * @example
 * objectReplacer({ token: 123, username: 'mark' }, { removeMatches: true })
 * // => { username: 'mark' }
 */
const objectReplacer: DataSanitizationReplacer = (data, options = {}) => {
  const {
    customPatterns,
    numericMask,
    patternMask,
    removeMatches = false,
    useDefaultPatterns = true,
  } = options;

  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const mask = patternMask ?? DEFAULT_PATTERN_MASK;
  const patterns = buildPatterns(useDefaultPatterns, customPatterns);
  const keyMatchers = patterns.map(
    (pattern) => new RegExp(`\\w*${escapePattern(pattern)}\\w*`, 'i'),
  );
  const seen = new WeakSet<object>();

  const sanitizeValue = (value: unknown): unknown => {
    if (typeof value !== 'object' || value === null) {
      return value;
    }

    if (seen.has(value)) {
      throw new TypeError('Circular reference detected in object structure');
    }

    seen.add(value);

    if (Array.isArray(value)) {
      const nextArray = value.map((item) => sanitizeValue(item));
      seen.delete(value);
      return nextArray;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      seen.delete(value);
      return value;
    }

    const nextObject: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(
      value as Record<string, unknown>,
    )) {
      const isSensitiveKey = keyMatchers.some((matcher) => matcher.test(key));

      if (isSensitiveKey) {
        if (!removeMatches) {
          nextObject[key] =
            typeof item === 'number'
              ? (numericMask ?? DEFAULT_NUMERIC_MASK)
              : mask;
        }
        continue;
      }

      nextObject[key] = sanitizeValue(item);
    }

    seen.delete(value);
    return nextObject;
  };

  return sanitizeValue(data) as Record<string, unknown>;
};

export { objectReplacer, stringReplacer };
