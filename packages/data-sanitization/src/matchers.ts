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
 * Matches field names in cookie header strings (`key=value; key=value`) and
 * URL form-encoded strings (`key=value&key=value`). Values stop at `&`, `;`,
 * `\r`, or `\n`, so neither format's separator is consumed as part of a value.
 *
 * @example
 * // Form-encoded masking
 * cookieAndFormEncodedMatcher('password')
 * // 'password=secret&user=alice' → 'password=**********&user=alice'
 *
 * @example
 * // Cookie masking
 * cookieAndFormEncodedMatcher('token')
 * // 'session_token=abc; user=alice' → 'session_token=**********; user=alice'
 *
 * @example
 * // Removal
 * cookieAndFormEncodedMatcher('password', true)
 * // 'password=secret&user=alice' → 'user=alice'
 *
 * @param pattern - Pattern used to match against field names.
 * @param remove - Whether to create a matcher for removing matched fields instead of masking values.
 * @param strict - When true, matches only the exact field name rather than as a substring.
 * @returns A global, case-insensitive regular expression for matching cookie and form-encoded fields.
 */
const cookieAndFormEncodedMatcher: DataSanitizationMatcher = (
  pattern,
  remove = false,
  strict = false,
) => {
  const escaped = escapePattern(pattern);
  // Strict mode uses a negative lookbehind to reject substring matches (e.g.
  // 'token' must not match inside 'session_token'). Non-strict mode wraps the
  // pattern with [\w-]* on both sides to intentionally match substrings.
  const fieldName = strict
    ? `(?<![\\w-])${escaped}`
    : `[\\w-]*${escaped}[\\w-]*`;
  const fieldPrefix = `${fieldName}[=:]`;
  const fieldValue = '[^\\r\\n&;]*';

  if (remove) {
    const removeLeadingField = `(?:&|;\\s*)${fieldPrefix}${fieldValue}`;
    const removeField = `${fieldPrefix}${fieldValue}(?:&|;\\s*)?`;

    return new RegExp(`${removeLeadingField}|${removeField}`, MATCHER_FLAGS);
  }

  // Zero-width lookahead so neither \r nor \n is consumed; content on
  // subsequent lines is preserved in the output.
  const maskField = `(${fieldPrefix})${fieldValue}(&|;\\s*|(?=\\r?\\n|$))`;

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
 * @param strict - When true, matches only the exact field name rather than as a substring.
 * @returns A global, case-insensitive regular expression for matching JSON-like fields.
 */
const jsonMatcher: DataSanitizationMatcher = (
  pattern,
  remove = false,
  strict = false,
) => {
  const escaped = escapePattern(pattern);
  const fieldName = strict ? escaped : `[\\w-]*${escaped}[\\w-]*`;

  if (remove) {
    const fieldPrefix = `"${fieldName}"\\s*:\\s*"`;
    const fieldValue = '[^"]*"';
    const removeLeadingField = `,\\s*${fieldPrefix}${fieldValue}`;
    const removeField = `${fieldPrefix}${fieldValue}\\s*,?`;

    return new RegExp(`${removeLeadingField}|${removeField}`, MATCHER_FLAGS);
  }

  const fieldPrefix = `"${fieldName}"\\s*:\\s*"`;
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
 * @param strict - When true, matches only the exact field name rather than as a substring.
 * @returns A global, case-insensitive regular expression for matching escaped JSON fields.
 */
const escapedJsonMatcher: DataSanitizationMatcher = (
  pattern,
  remove = false,
  strict = false,
) => {
  const escaped = escapePattern(pattern);
  const fieldName = strict ? escaped : `[\\w-]*${escaped}[\\w-]*`;
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

const defaultMatchers = [
  cookieAndFormEncodedMatcher,
  jsonMatcher,
  escapedJsonMatcher,
];

export {
  cookieAndFormEncodedMatcher,
  defaultMatchers,
  escapedJsonMatcher,
  escapePattern,
  jsonMatcher,
};

export default defaultMatchers;
