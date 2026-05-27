import { DataSanitizationMatcher, DataSanitizationReplacer } from './types';
import {
  DEFAULT_FIELD_NAME_PATTERNS,
  DEFAULT_NUMERIC_MASK,
  DEFAULT_PATTERN_MASK,
} from './constants';
import defaultMatchers, { escapePattern } from './matchers';

/**
 * Builds the active pattern list from defaults and any caller-supplied patterns.
 *
 * @param useDefaultPatterns - Whether to include the built-in default patterns.
 * @param customPatterns - Additional patterns to append to the active list.
 * @returns Combined array of field-name patterns to match against.
 */
const buildPatterns = (
  useDefaultPatterns: boolean,
  customPatterns?: string[],
): string[] => [
  ...(useDefaultPatterns ? DEFAULT_FIELD_NAME_PATTERNS : []),
  ...(customPatterns ?? []),
];

/**
 * Builds the active matcher list from defaults and any caller-supplied matchers.
 *
 * @param useDefaultMatchers - Whether to include the built-in default matchers.
 * @param customMatchers - Additional matchers to append to the active list.
 * @returns Combined array of matchers used to build replacement regexes.
 */
const buildMatchers = (
  useDefaultMatchers: boolean,
  customMatchers?: DataSanitizationMatcher[],
): DataSanitizationMatcher[] => [
  ...(useDefaultMatchers ? defaultMatchers : []),
  ...(customMatchers ?? []),
];

interface StringScanRegexes {
  preFilter: RegExp | null;
  regexes: RegExp[];
}

export const STRING_SCAN_CACHE_MAX = 10;
const stringScanCache = new Map<string, StringScanRegexes>();

// Assign stable numeric IDs to matcher functions by object identity so that
// two closures with identical source but different captured state don't collide.
const matcherIds = new WeakMap<DataSanitizationMatcher, number>();
let matcherIdCounter = 0;

/**
 * Returns a stable string ID for a matcher function by object identity.
 *
 * Assigns a new ID on first encounter and caches it in a WeakMap so that two
 * closures with identical source but different captured state do not collide.
 *
 * @param matcher - Matcher function to identify.
 * @returns Stable numeric string ID for the matcher.
 */
const getMatcherId = (matcher: DataSanitizationMatcher): string => {
  const existing = matcherIds.get(matcher);
  if (existing !== undefined) {
    return String(existing);
  }
  const id = matcherIdCounter++;
  matcherIds.set(matcher, id);
  return String(id);
};

/**
 * Builds and caches the pre-filter and per-pattern regexes used when scanning
 * non-sensitive string values for embedded sensitive patterns.
 *
 * Results are keyed by matcher identity, pattern list, and removeMatches flag,
 * and stored in an LRU cache capped at {@link STRING_SCAN_CACHE_MAX} entries.
 *
 * @param matchers - Active matcher functions.
 * @param patterns - Active field-name patterns.
 * @param removeMatches - Whether matchers should target removal instead of masking.
 * @returns Pre-filter regex (or `null` when no patterns are active) and per-pattern replacement regexes.
 */
const buildStringScanRegexes = (
  matchers: DataSanitizationMatcher[],
  patterns: string[],
  removeMatches: boolean,
): StringScanRegexes => {
  const key =
    matchers.map(getMatcherId).join('\x00') +
    '\x01' +
    patterns.join('\x00') +
    '\x01' +
    removeMatches;

  const cached = stringScanCache.get(key);
  if (cached) {
    // Refresh insertion order so this entry is treated as most recently used.
    stringScanCache.delete(key);
    stringScanCache.set(key, cached);
    return cached;
  }

  const result: StringScanRegexes = {
    preFilter:
      patterns.length > 0
        ? new RegExp(patterns.map(escapePattern).join('|'), 'i')
        : null,
    regexes: patterns.flatMap((pattern) =>
      matchers.map((matcher) => matcher(pattern, removeMatches)),
    ),
  };

  if (stringScanCache.size >= STRING_SCAN_CACHE_MAX) {
    const [lruKey] = stringScanCache.keys();
    stringScanCache.delete(lruKey);
  }
  stringScanCache.set(key, result);
  return result;
};

/**
 * Sanitizes a string by masking or removing sensitive data.
 *
 * This checks for some common patterns on how sensitive
 * data might appear in a string.
 *
 * @param data - Data string to be sanitized.
 * @param options - Matcher, pattern, masking, and removal options.
 * @returns Sanitized string data, or the original non-string data for runtime safety.
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
    parseJsonStrings = false,
    patternMask,
    removeMatches = false,
    useDefaultMatchers = true,
    useDefaultPatterns = true,
  } = options;

  if (typeof data !== 'string') {
    return data;
  }

  if (parseJsonStrings) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      // not valid JSON — fall through to regex path
    }
    if (parsed !== null && parsed !== undefined && typeof parsed === 'object') {
      return JSON.stringify(objectReplacer(parsed, options));
    }
  }

  const mask = patternMask ?? DEFAULT_PATTERN_MASK;
  const patterns = buildPatterns(useDefaultPatterns, customPatterns);
  const matchers = buildMatchers(useDefaultMatchers, customMatchers);

  const replacement = removeMatches ? '' : '$1' + mask + '$2';
  const { regexes } = buildStringScanRegexes(matchers, patterns, removeMatches);
  for (const regex of regexes) {
    data = data.replace(regex, replacement);
  }

  return data;
};

/**
 * Sanitizes object fields by key name, masking or removing matched keys.
 * String values on non-sensitive keys are scanned for embedded sensitive
 * patterns using the configured matchers and masked or removed in place.
 *
 * @param data - Object or array data to sanitize.
 * @param options - Pattern, matcher, masking, removal, and string-scan options.
 * @returns Sanitized object/array data, or the original non-object data for runtime safety.
 * @throws {TypeError} If a circular reference is encountered.
 *
 * @example
 * objectReplacer({ password: 'secret', username: 'mark' })
 * // => { password: '**********', username: 'mark' }
 *
 * @example
 * objectReplacer({ message: 'api_key=hunter2', username: 'mark' })
 * // => { message: 'api_key=**********', username: 'mark' }
 *
 * @example
 * objectReplacer({ token: 123, username: 'mark' }, { removeMatches: true })
 * // => { username: 'mark' }
 */
const objectReplacer: DataSanitizationReplacer = (data, options = {}) => {
  const {
    customMatchers,
    customPatterns,
    numericMask,
    patternMask,
    removeMatches = false,
    sanitizeCollections = false,
    scanStringValues = true,
    useDefaultMatchers = true,
    useDefaultPatterns = true,
  } = options;

  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const mask = patternMask ?? DEFAULT_PATTERN_MASK;
  const matchers = buildMatchers(useDefaultMatchers, customMatchers);
  const patterns = buildPatterns(useDefaultPatterns, customPatterns);
  const keyMatchers = patterns.map(
    (pattern) => new RegExp(`\\w*${escapePattern(pattern)}\\w*`, 'i'),
  );
  const { preFilter: patternPreFilter, regexes: stringRegexes } =
    scanStringValues
      ? buildStringScanRegexes(matchers, patterns, removeMatches)
      : { preFilter: null, regexes: [] };
  const seen = new WeakSet<object>();

  const stringScanReplacement = removeMatches ? '' : '$1' + mask + '$2';
  const scanStringValue = (value: string): string => {
    if (!patternPreFilter?.test(value)) {
      return value;
    }
    let result = value;
    for (const regex of stringRegexes) {
      result = result.replace(regex, stringScanReplacement);
    }
    return result;
  };

  const sanitizeValue = (value: unknown): unknown => {
    if (typeof value === 'string') {
      return scanStringValue(value);
    }

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

    if (sanitizeCollections && value instanceof Map) {
      const entries: [unknown, unknown][] = [];
      for (const [k, v] of value) {
        const sanitizedKey =
          typeof k === 'object' && k !== null ? sanitizeValue(k) : k;
        const isSensitiveStringKey =
          typeof k === 'string' && keyMatchers.some((m) => m.test(k));
        if (isSensitiveStringKey) {
          if (!removeMatches) {
            entries.push([
              sanitizedKey,
              typeof v === 'number'
                ? (numericMask ?? DEFAULT_NUMERIC_MASK)
                : mask,
            ]);
          }
        } else {
          entries.push([sanitizedKey, sanitizeValue(v)]);
        }
      }
      seen.delete(value);
      return new Map(entries);
    }

    if (sanitizeCollections && value instanceof Set) {
      const items: unknown[] = [];
      for (const item of value) {
        items.push(sanitizeValue(item));
      }
      seen.delete(value);
      return new Set(items);
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
