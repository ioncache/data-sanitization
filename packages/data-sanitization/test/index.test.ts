/* npm imports */
import { describe, expect, it } from 'vitest';

/* local imports */
import sanitizeData from '../src/index';
import { DataSanitizationError } from '../src/errors';
import { DEFAULT_NUMERIC_MASK, DEFAULT_PATTERN_MASK } from '../src/constants';

describe('DataSanitizationIndexAndErrors', () => {
  describe('sanitizeData', () => {
    it('should mask sensitive fields in an object', () => {
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

    it('should mask sensitive fields in a JSON string', () => {
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

    it('should mask sensitive fields whose values are arrays', () => {
      // Arrange
      const input = {
        password: 'secret',
        tokens: ['a', 'b'],
        username: 'bar',
      };

      // Act
      const output = sanitizeData(input) as Record<string, unknown>;

      // Assert
      expect(output.password).toEqual(DEFAULT_PATTERN_MASK);
      expect(output.tokens).toEqual(DEFAULT_PATTERN_MASK);
      expect(output.username).toEqual('bar');
    });

    it('should mask sensitive fields in an array of objects', () => {
      // Arrange
      const input = [
        { password: 'secret', username: 'bar' },
        { safe: true, token: 123 },
      ];

      // Act
      const output = sanitizeData(input) as Record<string, unknown>[];

      // Assert
      expect(output).toEqual([
        { password: DEFAULT_PATTERN_MASK, username: 'bar' },
        { safe: true, token: DEFAULT_NUMERIC_MASK },
      ]);
    });

    it('should mask sensitive fields regardless of value type', () => {
      // Arrange
      const input = {
        api_key: ['a', 'b'],
        apikey: { nested: true },
        password: 123456,
        secret: false,
        token: null,
        username: 'bar',
      };

      // Act
      const output = sanitizeData(input) as Record<string, unknown>;

      // Assert
      expect(output.password).toEqual(DEFAULT_NUMERIC_MASK);
      expect(output.secret).toEqual(DEFAULT_PATTERN_MASK);
      expect(output.token).toEqual(DEFAULT_PATTERN_MASK);
      expect(output.api_key).toEqual(DEFAULT_PATTERN_MASK);
      expect(output.apikey).toEqual(DEFAULT_PATTERN_MASK);
      expect(output.username).toEqual('bar');
    });

    it('should remove sensitive fields regardless of value type', () => {
      // Arrange
      const input = {
        api_key: ['a', 'b'],
        apikey: { nested: true },
        password: 123456,
        secret: false,
        token: null,
        username: 'bar',
      };

      // Act
      const output = sanitizeData(input, {
        removeMatches: true,
      }) as Record<string, unknown>;

      // Assert
      expect(output).toEqual({ username: 'bar' });
    });

    it('should return an empty object unchanged', () => {
      // Arrange
      const input = {};

      // Act
      const output = sanitizeData(input) as Record<string, unknown>;

      // Assert
      expect(output).toEqual({});
    });

    it('should return class instances unchanged', () => {
      // Arrange
      const input = new Date('2024-01-01');

      // Act
      const output = sanitizeData(input);

      // Assert
      expect(output).toBe(input);
    });

    it('should return null unchanged', () => {
      // Arrange
      const input = null;

      // Act
      const output = sanitizeData(input);

      // Assert
      expect(output).toBeNull();
    });

    it('should mask sensitive fields in a form-encoded string', () => {
      // Arrange
      const input = 'password=foo&username=bar';

      // Act
      const output = sanitizeData(input) as string;

      // Assert
      expect(output).toContain(`password=${DEFAULT_PATTERN_MASK}`);
      expect(output).toContain('username=bar');
    });

    it('should apply a caller-supplied mask string', () => {
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

    it('should throw an error when given a number', () => {
      // Arrange
      const input = 123 as unknown as Record<string, unknown>;
      let thrownError: unknown;

      // Act
      const act = (): void => {
        try {
          sanitizeData(input);
        } catch (error) {
          thrownError = error;
          throw error;
        }
      };

      // Assert
      expect(act).toThrowError(DataSanitizationError);
      expect(act).toThrowError('Invalid data type');
      expect((thrownError as DataSanitizationError).details).toEqual({
        inputType: 'number',
      });
    });

    it('should throw an error when given a boolean', () => {
      // Arrange
      const input = true as unknown as Record<string, unknown>;

      // Act
      const act = (): void => {
        sanitizeData(input);
      };

      // Assert
      expect(act).toThrowError(DataSanitizationError);
    });

    it('should throw an error when given undefined', () => {
      // Arrange
      const input = undefined as unknown as Record<string, unknown>;

      // Act
      const act = (): void => {
        sanitizeData(input);
      };

      // Assert
      expect(act).toThrowError(DataSanitizationError);
    });

    it('should wrap unexpected errors as a DataSanitizationError', () => {
      // Arrange
      const input: Record<string, unknown> = {};
      input.self = input;
      let thrownError: unknown;

      // Act
      const act = (): void => {
        try {
          sanitizeData(input);
        } catch (error) {
          thrownError = error;
          throw error;
        }
      };

      // Assert
      expect(act).toThrowError(DataSanitizationError);
      expect(act).toThrowError('Error parsing data');
      expect((thrownError as DataSanitizationError).details).toEqual({
        errorName: 'TypeError',
        inputType: 'object',
      });
    });

    it('should include the input type in the error details when an array contains a circular reference', () => {
      // Arrange
      const input: unknown[] = [];
      input.push(input);
      let thrownError: unknown;

      // Act
      const act = (): void => {
        try {
          sanitizeData(input as unknown as Record<string, unknown>);
        } catch (error) {
          thrownError = error;
          throw error;
        }
      };

      // Assert
      expect(act).toThrowError(DataSanitizationError);
      expect(act).toThrowError('Error parsing data');
      expect(thrownError).toBeInstanceOf(DataSanitizationError);
      expect((thrownError as DataSanitizationError).details).toEqual({
        errorName: 'TypeError',
        inputType: 'array',
      });
    });

    it('should mask sensitive string values containing quotes', () => {
      // Arrange
      const input = {
        password: 'abc"def',
        username: 'mark',
      };

      // Act
      const output = sanitizeData(input) as Record<string, unknown>;

      // Assert
      expect(output).toEqual({
        password: DEFAULT_PATTERN_MASK,
        username: 'mark',
      });
    });
  });

  describe('DataSanitizationError', () => {
    it('should expose the error name and attached details', () => {
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
