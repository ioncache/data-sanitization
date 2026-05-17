import { DataSanitizationError } from './errors';
import { stringReplacer } from './replacers';
import { DataSanitizationReplacer } from './types';

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
      originalData: data,
    });
  } catch (error) {
    if (error instanceof DataSanitizationError) {
      throw error;
    }
    throw new DataSanitizationError('Error parsing data', {
      error,
      originalData: data,
    });
  }
};

export { sanitizeData, DataSanitizationError };

export default sanitizeData;
