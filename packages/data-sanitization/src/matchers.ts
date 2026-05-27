import { DataSanitizationMatcher } from './types';

const MATCHER_FLAGS = 'gi';

/**
 * Escapes regular expression metacharacters in a pattern string.
 *
 * @param pattern - Pattern text to treat literally inside a regular expression.
 * @returns Pattern text with regular expression metacharacters escaped.
 *
 * @example
 * escapePattern('pass.*word')
 * // => 'pass\\.\\*word'
 */
const escapePattern = (pattern: string): string =>
  pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Matches field names in url form encoded data, or other types of
 * data similarly character delimited
 *
 * @example
 * // Masking
 * formEncodedMatcher('password')
 * // 'password=secret&user=alice' → 'password=**********&user=alice'
 *
 * @example
 * // Removal
 * formEncodedMatcher('password', true)
 * // 'password=secret&user=alice' → 'user=alice'
 *
 * @param pattern - Pattern in url form encoded like data used to match against field names.
 * @param remove - Whether to create a matcher for removing matched fields instead of masking values.
 * @returns A global, case-insensitive regular expression for matching form-like fields.
 */
const formEncodedMatcher: DataSanitizationMatcher = (
  pattern,
  remove = false,
) => {
  const escaped = escapePattern(pattern);
  const fieldName = `\\w*${escaped}\\w*`;
  const fieldPrefix = `${fieldName}[=:]`;
  const fieldValue = '[^\\r\\n&]*';

  if (remove) {
    const removeLeadingField = `&${fieldPrefix}${fieldValue}`;
    const removeField = `${fieldPrefix}${fieldValue}&?`;

    return new RegExp(`${removeLeadingField}|${removeField}`, MATCHER_FLAGS);
  }

  // Zero-width lookahead so neither \r nor \n is consumed; content on
  // subsequent lines is preserved in the output.
  const maskField = `(${fieldPrefix})${fieldValue}(&|(?=\\r?\\n|$))`;

  return new RegExp(maskField, MATCHER_FLAGS);
};

/**
 * Matches field names in json/json-like structured data
 *
 * @example
 * // Masking
 * jsonMatcher('password')
 * // '{"password":"secret","user":"alice"}' → '{"password":"**********","user":"alice"}'
 *
 * @example
 * // Removal
 * jsonMatcher('password', true)
 * // '{"password":"secret","user":"alice"}' → '{"user":"alice"}'
 *
 * @param pattern - Pattern in json-like data used to match against field names.
 * @param remove - Whether to create a matcher for removing matched fields instead of masking values.
 * @returns A global, case-insensitive regular expression for matching JSON-like fields.
 */
const jsonMatcher: DataSanitizationMatcher = (pattern, remove = false) => {
  const escaped = escapePattern(pattern);
  const fieldName = `\\w*${escaped}\\w*`;

  if (remove) {
    const fieldPrefix = `"${fieldName}"\\s*:\\s*"`;
    const fieldValue = '[^"]*"';
    const removeLeadingField = `,\\s*${fieldPrefix}${fieldValue}`;
    const removeField = `${fieldPrefix}${fieldValue}\\s*,?`;

    return new RegExp(`${removeLeadingField}|${removeField}`, MATCHER_FLAGS);
  }

  const fieldPrefix = `"${fieldName}"?:\\s*"`;
  const maskField = `(${fieldPrefix})(?:[^"\\\\]|\\\\.)+?(")`;

  return new RegExp(maskField, MATCHER_FLAGS);
};

/**
 * Matches field names in escaped JSON data, where quotes are
 * backslash-escaped (e.g. JSON embedded inside a JSON string value)
 *
 * @example
 * // Masking
 * escapedJsonMatcher('password')
 * // '{\"password\":\"secret\"}' → '{\"password\":\"**********\"}'
 *
 * @example
 * // Removal
 * escapedJsonMatcher('password', true)
 * // '{\"password\":\"secret\",\"user\":\"alice\"}' → '{\"user\":\"alice\"}'
 *
 * @param pattern - Pattern in escaped json data used to match against field names.
 * @param remove - Whether to create a matcher for removing matched fields instead of masking values.
 * @returns A global, case-insensitive regular expression for matching escaped JSON fields.
 */
const escapedJsonMatcher: DataSanitizationMatcher = (
  pattern,
  remove = false,
) => {
  const escaped = escapePattern(pattern);
  const fieldName = `\\w*${escaped}\\w*`;
  const fieldPrefix = `\\\\"${fieldName}\\\\"\\s*:\\s*\\\\"`;

  if (remove) {
    const fieldValue = '[^\\\\"]*\\\\"';
    const removeLeadingField = `,\\s*${fieldPrefix}${fieldValue}`;
    const removeField = `${fieldPrefix}${fieldValue}\\s*,?`;

    return new RegExp(`${removeLeadingField}|${removeField}`, MATCHER_FLAGS);
  }

  const maskField = `(${fieldPrefix})(?:[^\\\\]|\\\\[^"])+?(\\\\")`;

  return new RegExp(maskField, MATCHER_FLAGS);
};

const defaultMatchers = [formEncodedMatcher, jsonMatcher, escapedJsonMatcher];

export {
  defaultMatchers,
  escapedJsonMatcher,
  escapePattern,
  formEncodedMatcher,
  jsonMatcher,
};

export default defaultMatchers;
