/**
 * DataSanitizationMatchers are regex matchers to test against field names in data.
 *
 * They need to be global and case insensitive to ensure all fields that match
 * the given field patterns are caught.
 *
 * @param pattern - Field-name pattern used to create the matcher.
 * @param remove - Whether the matcher should support removal instead of masking.
 * @returns A regular expression that matches sensitive fields for the pattern.
 */
type DataSanitizationMatcher = (pattern: string, remove?: boolean) => RegExp;

interface DataSanitizationReplacerOptions {
  /**
   * Array of DataSanitizationMatchers to use in addition or in place
   * of the built-in default matchers
   */
  customMatchers?: DataSanitizationMatcher[];
  /**
   * Array of patterns to use in addition or in place
   * of the built-in default patterns
   */
  customPatterns?: string[];
  /**
   * A string to use as a data mask in place of the built-in default mask
   */
  patternMask?: string;
  /**
   * Whether to remove fields matched instead of masking them. Default: false
   */
  removeMatches?: boolean;
  /**
   * Whether to use the built-in default matchers. Default: true
   */
  useDefaultMatchers?: boolean;
  /**
   * Whether to use the built-in default patterns. Default: true
   */
  useDefaultPatterns?: boolean;
}

/**
 * DataSanitizationReplacers are functions that take string data
 * and replace or remove sensitive information
 *
 * @param data - String or object data to sanitize.
 * @param options - Matcher, pattern, masking, and removal options.
 * @returns Sanitized string or object data.
 */
type DataSanitizationReplacer = (
  data: string | Record<string, unknown>,
  options?: DataSanitizationReplacerOptions,
) => string | Record<string, unknown>;

export {
  DataSanitizationMatcher,
  DataSanitizationReplacer,
  DataSanitizationReplacerOptions,
};
