/**
 * These are some default patterns to search within field
 * names used to determine what data is sanitized.
 */
const DEFAULT_FIELD_NAME_PATTERNS = [
  'apikey',
  'api_key',
  'password',
  'secret',
  'token',
];

/**
 * A default mask used when replacing string field values.
 */
const DEFAULT_PATTERN_MASK = '**********';

/**
 * A default mask used when replacing number field values.
 */
const DEFAULT_NUMERIC_MASK = 9999999999;

export {
  DEFAULT_FIELD_NAME_PATTERNS,
  DEFAULT_NUMERIC_MASK,
  DEFAULT_PATTERN_MASK,
};
