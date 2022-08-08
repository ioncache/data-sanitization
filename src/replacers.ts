/* local imports */
import { DataSanitizationMatcher, DataSanitizationReplacer } from '~/types';
import { DEFAULT_FIELD_NAME_PATTERNS, DEFAULT_PATTERN_MASK } from '~/constants';
import defaultMatchers from '~/matchers';

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
 * @param data Data string to be sanitized
 * @param options
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

  // for safety in non-typescript environments
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

  for (const pattern of patterns) {
    let matchers: DataSanitizationMatcher[] = [];

    if (useDefaultMatchers) {
      matchers = [...defaultMatchers];
    }

    if (Array.isArray(customMatchers)) {
      matchers = [...matchers, ...customMatchers];
    }

    for (const matcher of matchers) {
      const matchInstance = matcher(pattern);

      if (removeMatches) {
        // FIXME: the remove option is not currently working
        data = data.replace(matchInstance, '');
      } else {
        data = data.replace(matchInstance, '$1' + mask + '$2');
      }
    }
  }

  return data;
};

export { stringReplacer };
