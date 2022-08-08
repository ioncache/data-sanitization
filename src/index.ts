/* local imports */
import { DataSanitizationError } from '~/errors';
import { DataSanitizationReplacer } from '~/types';
import { stringReplacer } from '~/replacers';

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
 * @param data Data to be sanitized
 * @param options
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

    // for data types other than string or object we throw
    // an error since we cannot sanitize it
    throw new DataSanitizationError('Invalid data type', {
      originalData: data,
    });
  } catch (error) {
    // if some sort of uncaught error occurred when attempting to sanitize
    // the data, we throw an error message instead as we can't be sure
    // that the data was safe
    throw new DataSanitizationError('Error parsing data', {
      error,
      originalData: data,
    });
  }
};

export { sanitizeData };

export default sanitizeData;
