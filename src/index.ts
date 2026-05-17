import { DataSanitizationError } from './errors';
import { stringReplacer } from './replacers';
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
 * The approach taken is to always convert the incoming data to a
 * string and then perform sanitization on the string.
 *
 * Whenever possible the data will be converted back to the original
 * type and returned.
 *
 * When this fails the data may be returned as a string that has been
 * sanitized, or as an object containing an error message.
 *
 * @param data - String or object data to be sanitized.
 * @param options - Matcher, pattern, masking, and removal options.
 * @returns Sanitized data converted back to the original supported input type when possible.
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
 */
const sanitizeData: DataSanitizationReplacer = (data, options = {}) => {
  try {
    if (typeof data === 'string') {
      return stringReplacer(data, options);
    }

    if (typeof data === 'object') {
      const stringifiedData = JSON.stringify(data);
      const sanitizedData = stringReplacer(stringifiedData, options) as string;
      return JSON.parse(sanitizedData);
    }

    throw new DataSanitizationError('Invalid data type', {
      ...createSafeErrorDetails(data),
    });
  } catch (error) {
    if (error instanceof DataSanitizationError) {
      throw error;
    }
    throw new DataSanitizationError('Error parsing data', {
      ...createSafeErrorDetails(data, error),
    });
  }
};

export { sanitizeData, DataSanitizationError };

export default sanitizeData;
