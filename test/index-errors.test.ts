/* local imports */
import sanitizeData from '../src/index';
import { DataSanitizationError } from '../src/errors';
import { DEFAULT_PATTERN_MASK } from '../src/constants';

describe('DataSanitizationIndexAndErrors', () => {
  describe('sanitizeData', () => {
    it('should sanitize object input and return object output', () => {
      // Arrange
      const input = {
        db_password: 'baz',
        password: 'foo',
        username: 'bar',
      };

      // Act
      const output = sanitizeData(input) as Record<string, unknown>;

      // Assert
      expect(output.password).toEqual(DEFAULT_PATTERN_MASK);
      expect(output.db_password).toEqual(DEFAULT_PATTERN_MASK);
      expect(output.username).toEqual('bar');
    });

    it('should sanitize string input and return string output', () => {
      // Arrange
      const input = '{"password":"foo","username":"bar"}';

      // Act
      const output = sanitizeData(input) as string;

      // Assert
      expect(output).toContain(`"password":"${DEFAULT_PATTERN_MASK}"`);
      expect(output).toContain('"username":"bar"');
    });

    it('should throw DataSanitizationError for invalid data type', () => {
      // Arrange
      const input = 123 as unknown as Record<string, unknown>;

      // Act
      const act = (): void => {
        sanitizeData(input);
      };

      // Assert
      expect(act).toThrowError(DataSanitizationError);
      expect(act).toThrowError('Error parsing data');
    });
  });

  describe('DataSanitizationError', () => {
    it('should set name and details on custom error', () => {
      // Arrange
      const details = { reason: 'test' };

      // Act
      const error = new DataSanitizationError('boom', details);

      // Assert
      expect(error.name).toEqual('DataSanitizationError');
      expect(error.message).toEqual('boom');
      expect(error.details).toEqual(details);
    });
  });
});
