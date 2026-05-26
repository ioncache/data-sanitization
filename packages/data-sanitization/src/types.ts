/**
 * DataSanitizationMatchers are regex matchers to test against field names in data.
 *
 * They need to be global and case insensitive to ensure all fields that match
 * the given field patterns are caught.
 *
 * @param pattern - Field-name pattern used to create the matcher.
 * @param remove - Whether the matcher should support removal instead of masking.
 * @returns A regular expression that matches sensitive fields for the pattern.
 * @throws {Error} If the matcher cannot create a regular expression for the pattern.
 *
 * @example
 * const matcher: DataSanitizationMatcher = (pattern) => new RegExp(pattern, 'gi');
 * matcher('password').test('password=secret');
 * // => true
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
   * A number to use as a mask for number-typed field values in place of the
   * built-in default numeric mask
   */
  numericMask?: number;
  /**
   * Whether to parse string input as JSON and sanitize via the object
   * path. When the input is valid JSON containing an object or array,
   * the sanitized result is re-serialized with JSON.stringify. Falls
   * back to regex-based sanitization when the input is not valid JSON
   * or parses to a primitive. Has no effect on non-string input.
   *
   * Note: JSON.stringify does not preserve original whitespace or
   * indentation. Enable this option only when formatting fidelity is
   * not required.
   *
   * Default: false
   */
  parseJsonStrings?: boolean;
  /**
   * A string to use as a data mask in place of the built-in default mask
   */
  patternMask?: string;
  /**
   * Whether to remove fields matched instead of masking them. Default: false
   */
  removeMatches?: boolean;
  /**
   * Whether to sanitize `Map` and `Set` instances by traversing their entries
   * and returning a new sanitized copy. When false (the default), these pass
   * through without modification, matching the behaviour for other non-plain
   * object instances.
   *
   * Default: false
   */
  sanitizeCollections?: boolean;
  /**
   * Whether to scan string values on non-sensitive-key fields for embedded
   * sensitive patterns. Disabling this improves performance on object
   * workloads. Has no effect on raw string input unless `parseJsonStrings`
   * is also enabled — in that case the string is parsed to an object first
   * and scanning applies normally. Default: true
   */
  scanStringValues?: boolean;
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
 * Options for {@link buildSanitizedWarning}.
 */
interface BuildSanitizedWarningOptions {
  /**
   * An explicit list of field names to carry over from the sanitized log
   * object into the warning entry. When omitted, all fields whose values
   * did not change are included.
   */
  allowedFields?: readonly string[];
}

/**
 * Data accepted by sanitization replacers.
 */
type DataSanitizationInput = string | object | null;

/**
 * Data returned by sanitization replacers.
 */
type DataSanitizationOutput = string | object | null;

/**
 * DataSanitizationReplacers are functions that take supported data
 * and replace or remove sensitive information.
 *
 * @param data - String, object, array, or null data to sanitize.
 * @param options - Matcher, pattern, masking, and removal options.
 * @returns Sanitized data in the original supported input type when possible.
 * @throws {Error} If sanitization fails while matching or serializing data.
 *
 * @example
 * const replacer: DataSanitizationReplacer = (data) => data;
 * replacer('password=secret');
 * // => 'password=secret'
 */
type DataSanitizationReplacer = (
  data: DataSanitizationInput,
  options?: DataSanitizationReplacerOptions,
) => DataSanitizationOutput;

export {
  BuildSanitizedWarningOptions,
  DataSanitizationInput,
  DataSanitizationMatcher,
  DataSanitizationOutput,
  DataSanitizationReplacer,
  DataSanitizationReplacerOptions,
};
