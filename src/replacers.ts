import { DataSanitizationMatcher, DataSanitizationReplacer } from './types';
import { DEFAULT_FIELD_NAME_PATTERNS, DEFAULT_PATTERN_MASK } from './constants';
import defaultMatchers from './matchers';

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

  let patterns: string[] = [];

  if (useDefaultPatterns) {
    patterns = [...DEFAULT_FIELD_NAME_PATTERNS];
  }

  if (Array.isArray(customPatterns)) {
    patterns = [...patterns, ...customPatterns];
  }

  let matchers: DataSanitizationMatcher[] = [];

  if (useDefaultMatchers) {
    matchers = [...defaultMatchers];
  }

  if (Array.isArray(customMatchers)) {
    matchers = [...matchers, ...customMatchers];
  }

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

export { stringReplacer };
