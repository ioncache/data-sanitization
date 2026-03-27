/* npm imports */
import { describe, expect, it } from 'vitest';

/* local imports */
import { stringReplacer } from '../src/replacers';
import { DEFAULT_PATTERN_MASK } from '../src/constants';

describe('DataSanitizationReplacers', () => {
  describe('stringReplacer', () => {
    describe('masking', () => {
      it('should replace values in matched field patterns with a mask string', () => {
        // Arrange
        const testObject = {
          db_password: 'baz',
          password: 'foo',
          username: 'bar',
        };
        const testData = JSON.stringify(testObject);

        // Act
        const replacedData = stringReplacer(testData) as string;
        const replacedObject = JSON.parse(replacedData);

        // Assert
        expect(replacedObject.password).toEqual(DEFAULT_PATTERN_MASK);
        expect(replacedObject.db_password).toEqual(DEFAULT_PATTERN_MASK);
        expect(replacedObject.username).toEqual('bar');
      });

      it('should mask all default patterns in JSON data', () => {
        // Arrange
        const testData = JSON.stringify({
          apikey: 'k1',
          api_key: 'k2',
          password: 'p1',
          secret: 's1',
          token: 't1',
          username: 'safe',
        });

        // Act
        const result = JSON.parse(stringReplacer(testData) as string);

        // Assert
        expect(result.apikey).toEqual(DEFAULT_PATTERN_MASK);
        expect(result.api_key).toEqual(DEFAULT_PATTERN_MASK);
        expect(result.password).toEqual(DEFAULT_PATTERN_MASK);
        expect(result.secret).toEqual(DEFAULT_PATTERN_MASK);
        expect(result.token).toEqual(DEFAULT_PATTERN_MASK);
        expect(result.username).toEqual('safe');
      });

      it('should mask all default patterns in form-encoded data', () => {
        // Arrange
        const testData =
          'apikey=k1&api_key=k2&password=p1&secret=s1&token=t1&username=safe';

        // Act
        const result = stringReplacer(testData) as string;

        // Assert
        expect(result).toContain(`apikey=${DEFAULT_PATTERN_MASK}`);
        expect(result).toContain(`api_key=${DEFAULT_PATTERN_MASK}`);
        expect(result).toContain(`password=${DEFAULT_PATTERN_MASK}`);
        expect(result).toContain(`secret=${DEFAULT_PATTERN_MASK}`);
        expect(result).toContain(`token=${DEFAULT_PATTERN_MASK}`);
        expect(result).toContain('username=safe');
      });

      it('should use a custom mask when patternMask is provided', () => {
        // Arrange
        const testData = '{"password":"foo","username":"bar"}';

        // Act
        const result = stringReplacer(testData, {
          patternMask: '[REDACTED]',
        }) as string;

        // Assert
        expect(result).toContain('"password":"[REDACTED]"');
        expect(result).toContain('"username":"bar"');
      });

      it('should leave data unchanged when no patterns match', () => {
        // Arrange
        const testData = '{"username":"foo","email":"bar@example.com"}';

        // Act
        const result = stringReplacer(testData) as string;

        // Assert
        expect(result).toEqual(testData);
      });

      it('should handle an empty string', () => {
        // Act
        const result = stringReplacer('') as string;

        // Assert
        expect(result).toBe('');
      });

      it('should mask nested JSON objects', () => {
        // Arrange
        const testData = JSON.stringify({
          user: 'mark',
          credentials: { password: 'secret', token: 'abc' },
        });

        // Act
        const result = JSON.parse(stringReplacer(testData) as string);

        // Assert
        expect(result.credentials.password).toEqual(DEFAULT_PATTERN_MASK);
        expect(result.credentials.token).toEqual(DEFAULT_PATTERN_MASK);
        expect(result.user).toEqual('mark');
      });

      it('should mask values containing special characters', () => {
        // Arrange
        const testData = JSON.stringify({
          password: 'p@$$w0rd!#%^&*()',
          username: 'bar',
        });

        // Act
        const result = JSON.parse(stringReplacer(testData) as string);

        // Assert
        expect(result.password).toEqual(DEFAULT_PATTERN_MASK);
        expect(result.username).toEqual('bar');
      });
    });

    describe('removal', () => {
      it('should remove matched fields from JSON data', () => {
        // Arrange
        const testData = JSON.stringify({
          db_password: 'baz',
          password: 'foo',
          username: 'bar',
        });

        // Act
        const result = JSON.parse(
          stringReplacer(testData, { removeMatches: true }) as string,
        );

        // Assert
        expect(result).toEqual({ username: 'bar' });
      });

      it('should produce valid JSON when removing the only field', () => {
        // Arrange
        const testData = JSON.stringify({ password: 'secret' });

        // Act
        const result = stringReplacer(testData, {
          removeMatches: true,
        }) as string;

        // Assert
        expect(JSON.parse(result)).toEqual({});
      });

      it('should produce clean form-encoded output when removing fields', () => {
        // Arrange
        const testData = 'db_password=baz&password=foo&username=bar';

        // Act
        const result = stringReplacer(testData, {
          removeMatches: true,
        }) as string;

        // Assert
        expect(result).toBe('username=bar');
      });

      it('should produce an empty string when removing all form-encoded fields', () => {
        // Arrange
        const testData = 'password=foo&token=bar';

        // Act
        const result = stringReplacer(testData, {
          removeMatches: true,
        }) as string;

        // Assert
        expect(result).toBe('');
      });
    });

    describe('options', () => {
      it('should return non-string input unchanged for runtime safety', () => {
        // Arrange
        const testData = { password: 'foo' } as unknown as string;

        // Act
        const replacedData = stringReplacer(testData);

        // Assert
        expect(replacedData).toEqual(testData);
      });

      it('should support custom patterns and matchers when defaults are disabled', () => {
        // Arrange
        const testData = 'token=abc&username=mark';

        // Act
        const replacedData = stringReplacer(testData, {
          customPatterns: ['token'],
          customMatchers: [
            (pattern: string) =>
              new RegExp(`(\\w*${pattern}\\w*[=:])(?:\\W?.*?)([\\W]|$)`, 'gi'),
          ],
          patternMask: '[MASKED]',
          useDefaultMatchers: false,
          useDefaultPatterns: false,
        }) as string;

        // Assert
        expect(replacedData).toContain('token=[MASKED]');
        expect(replacedData).toContain('username=mark');
      });

      it('should skip default patterns when useDefaultPatterns is false', () => {
        // Arrange
        const testData = '{"password":"foo","username":"bar"}';

        // Act
        const result = stringReplacer(testData, {
          useDefaultPatterns: false,
        }) as string;

        // Assert
        expect(result).toEqual(testData);
      });

      it('should skip default matchers when useDefaultMatchers is false', () => {
        // Arrange
        const testData = '{"password":"foo","username":"bar"}';

        // Act
        const result = stringReplacer(testData, {
          useDefaultMatchers: false,
        }) as string;

        // Assert
        expect(result).toEqual(testData);
      });

      it('should combine custom patterns with default patterns', () => {
        // Arrange
        const testData = JSON.stringify({
          password: 'p1',
          ssn: '123-45-6789',
          username: 'bar',
        });

        // Act
        const result = JSON.parse(
          stringReplacer(testData, {
            customPatterns: ['ssn'],
          }) as string,
        );

        // Assert
        expect(result.password).toEqual(DEFAULT_PATTERN_MASK);
        expect(result.ssn).toEqual(DEFAULT_PATTERN_MASK);
        expect(result.username).toEqual('bar');
      });
    });
  });
});
