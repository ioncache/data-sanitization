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
 * A default pattern used when replacing field values.
 */
const DEFAULT_PATTERN_MASK = '**********';

export { DEFAULT_FIELD_NAME_PATTERNS, DEFAULT_PATTERN_MASK };
