/**
 * DataSanitizationMatchers are regex matchers to test against field names in data.
 *
 * They need to be global and case insensitive to ensure all fields that matcher
 * the given field patterns are caught.
 */
type DataSanitizationMatcher = (pattern: string) => RegExp;

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
 */
type DataSanitizationReplacer = (
  data: string,
  options?: DataSanitizationReplacerOptions,
) => string;

export {
  DataSanitizationMatcher,
  DataSanitizationReplacer,
  DataSanitizationReplacerOptions,
};
