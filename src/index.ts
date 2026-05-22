import { DataSanitizationError } from './errors';
import { objectReplacer, stringReplacer } from './replacers';
import { DataSanitizationReplacer } from './types';

/**
 * Returns a safe type label for data passed to the sanitizer.
 *
 * @param data - Input value being sanitized.
 * @returns A type label that does not expose the input value.
 * @throws Does not throw.
 *
 * @example
 * getInputType({ password: 'secret' })
 * // => 'object'
 */
const getInputType = (data: unknown): string => {
  if (data === null) {
    return 'null';
  }

  if (Array.isArray(data)) {
    return 'array';
  }

  return typeof data;
};

/**
 * Builds public error details that do not include caller payloads.
 *
 * @param data - Input value being sanitized.
 * @param error - Optional wrapped error from the failed operation.
 * @returns Structured diagnostics safe for logging.
 * @throws Does not throw.
 *
 * @example
 * createSafeErrorDetails({ password: 'secret' }, new SyntaxError('Bad JSON'))
 * // => { inputType: 'object', errorName: 'SyntaxError' }
 */
const createSafeErrorDetails = (
  data: unknown,
  error?: unknown,
): Record<string, string> => {
  const details: Record<string, string> = {
    inputType: getInputType(data),
  };

  if (error instanceof Error) {
    details.errorName = error.name;
  }

  return details;
};

/**
 * Sanitizes data in an object/string to make it safe for logging
 * or other purposes of a sensitive nature
 *
 * Strings are sanitized via {@link stringReplacer}. Non-null objects and arrays
 * are sanitized directly via {@link objectReplacer} without any string
 * conversion. Null is JSON-stringified, sanitized via {@link stringReplacer},
 * then parsed back.
 *
 * @param data - String, null, or object data to be sanitized.
 * @param options - Matcher, pattern, masking, removal, and string-scan options.
 * @returns Sanitized data in the original supported input type when possible.
 * @throws {DataSanitizationError} When the input data type cannot be sanitized.
 * @throws {DataSanitizationError} When sanitized object data cannot be parsed back to JSON.
 *
 * @example
 * // Sanitize a JSON string
 * sanitizeData('{"password":"secret","username":"mark"}')
 * // => '{"password":"**********","username":"mark"}'
 *
 * @example
 * // Sanitize an object
 * sanitizeData({ password: 'secret', username: 'mark' })
 * // => { password: '**********', username: 'mark' }
 *
 * @example
 * // Sanitize with a custom mask
 * sanitizeData({ token: 'abc123' }, { patternMask: '[REDACTED]' })
 * // => { token: '[REDACTED]' }
 *
 * @example
 * // String values on non-sensitive keys are scanned for embedded patterns by default
 * sanitizeData({ message: 'request failed: api_key=hunter2' })
 * // => { message: 'request failed: api_key=**********' }
 */
const sanitizeData: DataSanitizationReplacer = (data, options = {}) => {
  try {
    if (typeof data === 'string') {
      return stringReplacer(data, options);
    }

    if (typeof data === 'object') {
      if (data === null) {
        return JSON.parse(
          stringReplacer(JSON.stringify(data), options) as string,
        );
      }
      return objectReplacer(data, options);
    }

    throw new DataSanitizationError(
      'Invalid data type',
      createSafeErrorDetails(data),
    );
  } catch (error) {
    if (error instanceof DataSanitizationError) {
      throw error;
    }
    throw new DataSanitizationError(
      'Error parsing data',
      createSafeErrorDetails(data, error),
    );
  }
};

export { sanitizeData, DataSanitizationError };

export default sanitizeData;
