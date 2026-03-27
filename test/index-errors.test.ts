/* npm imports */
import { describe, expect, it } from 'vitest';

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

    it('should sanitize a deeply nested object', () => {
      // Arrange
      const input = {
        level1: {
          level2: {
            password: 'deep-secret',
            safe: 'visible',
          },
        },
      };

      // Act
      const output = sanitizeData(input) as Record<string, unknown>;

      // Assert
      const nested = (output.level1 as Record<string, unknown>)
        .level2 as Record<string, unknown>;
      expect(nested.password).toEqual(DEFAULT_PATTERN_MASK);
      expect(nested.safe).toEqual('visible');
    });

    it('should sanitize objects containing arrays', () => {
      // Arrange
      const input = {
        tokens: ['a', 'b'],
        username: 'bar',
        password: 'secret',
      };

      // Act
      const output = sanitizeData(input) as Record<string, unknown>;

      // Assert
      expect(output.password).toEqual(DEFAULT_PATTERN_MASK);
      expect(output.tokens).toEqual(['a', 'b']);
      expect(output.username).toEqual('bar');
    });

    it('should sanitize an empty object without error', () => {
      // Arrange
      const input = {};

      // Act
      const output = sanitizeData(input) as Record<string, unknown>;

      // Assert
      expect(output).toEqual({});
    });

    it('should sanitize form-encoded string input', () => {
      // Arrange
      const input = 'password=foo&username=bar';

      // Act
      const output = sanitizeData(input) as string;

      // Assert
      expect(output).toContain(`password=${DEFAULT_PATTERN_MASK}`);
      expect(output).toContain('username=bar');
    });

    it('should pass options through to the replacer', () => {
      // Arrange
      const input = { password: 'foo', username: 'bar' };

      // Act
      const output = sanitizeData(input, {
        patternMask: '[HIDDEN]',
      }) as Record<string, unknown>;

      // Assert
      expect(output.password).toEqual('[HIDDEN]');
      expect(output.username).toEqual('bar');
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
      expect(act).toThrowError('Invalid data type');
    });

    it('should throw DataSanitizationError for boolean input', () => {
      // Arrange
      const input = true as unknown as Record<string, unknown>;

      // Act
      const act = (): void => {
        sanitizeData(input);
      };

      // Assert
      expect(act).toThrowError(DataSanitizationError);
    });

    it('should throw DataSanitizationError for undefined input', () => {
      // Arrange
      const input = undefined as unknown as Record<string, unknown>;

      // Act
      const act = (): void => {
        sanitizeData(input);
      };

      // Assert
      expect(act).toThrowError(DataSanitizationError);
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

    it('should default details to an empty object', () => {
      // Act
      const error = new DataSanitizationError('oops');

      // Assert
      expect(error.details).toEqual({});
    });

    it('should be an instance of Error', () => {
      // Act
      const error = new DataSanitizationError('test');

      // Assert
      expect(error).toBeInstanceOf(Error);
    });
  });
});
