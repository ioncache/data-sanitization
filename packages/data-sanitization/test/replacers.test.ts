/* npm imports */
import { describe, expect, it } from 'vitest';

/* local imports */
import {
  objectReplacer,
  stringReplacer,
  STRING_SCAN_CACHE_MAX,
} from '../src/replacers';
import { DEFAULT_NUMERIC_MASK, DEFAULT_PATTERN_MASK } from '../src/constants';

const headerMatcher = (pattern: string) =>
  new RegExp(
    `(${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*).+?(\\n|$)`,
    'gi',
  );

const makeCustomMatcher =
  (prefix: string) =>
  (pattern: string): RegExp =>
    // Group 1: prefix+key+delimiter, Group 2: trailing & or end-of-string
    new RegExp(`(${prefix}${pattern}=)[^&\\n]+(&|$)`, 'gi');

describe('DataSanitizationReplacers', () => {
  describe('stringReplacer', () => {
    describe('when masking sensitive field values', () => {
      it('should mask values of fields matching the default patterns', () => {
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
          api_key: 'k2',
          apikey: 'k1',
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
          credentials: { password: 'secret', token: 'abc' },
          user: 'mark',
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

      it('should mask unicode sensitive values', () => {
        // Arrange
        const testData = JSON.stringify({
          password: 'paß🔐word',
          username: 'márk',
        });

        // Act
        const result = JSON.parse(stringReplacer(testData) as string);

        // Assert
        expect(result.password).toEqual(DEFAULT_PATTERN_MASK);
        expect(result.username).toEqual('márk');
      });

      it('should fully mask form values containing non-delimiter punctuation', () => {
        // Arrange
        const testData =
          'password=abc-123&token=a%2Bb%2Fc&secret=a.b:c+z/9&username=mark';

        // Act
        const result = stringReplacer(testData) as string;

        // Assert
        expect(result).toBe(
          `password=${DEFAULT_PATTERN_MASK}&token=${DEFAULT_PATTERN_MASK}&secret=${DEFAULT_PATTERN_MASK}&username=mark`,
        );
      });
    });

    describe('when removing sensitive fields', () => {
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

      it('should remove complete form values containing non-delimiter punctuation', () => {
        // Arrange
        const testData =
          'password=abc-123&token=a%2Bb%2Fc&secret=a.b:c+z/9&username=mark';

        // Act
        const result = stringReplacer(testData, {
          removeMatches: true,
        }) as string;

        // Assert
        expect(result).toBe('username=mark');
      });
    });

    describe('when configured with custom options', () => {
      it('should return non-string input unchanged', () => {
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
          customMatchers: [
            (pattern: string) =>
              new RegExp(`(\\w*${pattern}\\w*[=:])(?:\\W?.*?)([\\W]|$)`, 'gi'),
          ],
          customPatterns: ['token'],
          patternMask: '[MASKED]',
          useDefaultMatchers: false,
          useDefaultPatterns: false,
        }) as string;

        // Assert
        expect(replacedData).toContain('token=[MASKED]');
        expect(replacedData).toContain('username=mark');
      });

      it('should reuse the compiled pattern configuration across repeated calls', () => {
        // Arrange
        let matcherCalls = 0;
        const matcher = (pattern: string): RegExp => {
          matcherCalls++;
          return new RegExp(`(${pattern}=)[^&\n]+(&|$)`, 'gi');
        };
        const options = {
          customMatchers: [matcher],
          customPatterns: ['cache_key'],
          useDefaultMatchers: false,
          useDefaultPatterns: false,
        };

        // Act
        const first = stringReplacer(
          'cache_key=first&username=mark',
          options,
        ) as string;
        const second = stringReplacer(
          'cache_key=second&username=mark',
          options,
        ) as string;

        // Assert
        expect(first).toBe(`cache_key=${DEFAULT_PATTERN_MASK}&username=mark`);
        expect(second).toBe(`cache_key=${DEFAULT_PATTERN_MASK}&username=mark`);
        expect(matcherCalls).toBe(1);
      });

      it('should not mask any fields when default patterns are disabled', () => {
        // Arrange
        const testData = '{"password":"foo","username":"bar"}';

        // Act
        const result = stringReplacer(testData, {
          useDefaultPatterns: false,
        }) as string;

        // Assert
        expect(result).toEqual(testData);
      });

      it('should not mask any fields when default matchers are disabled', () => {
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

    describe('when JSON string parsing is enabled', () => {
      it('should not mask numeric sensitive field values when JSON string parsing is disabled', () => {
        // Arrange
        const testData = '{"password":12345,"username":"mark"}';

        // Act
        const result = JSON.parse(stringReplacer(testData) as string);

        // Assert
        expect(result.password).toBe(12345);
      });

      it('should mask numeric sensitive field values', () => {
        // Arrange
        const testData = '{"password":12345,"username":"mark"}';

        // Act
        const result = JSON.parse(
          stringReplacer(testData, { parseJsonStrings: true }) as string,
        );

        // Assert
        expect(result.password).toBe(DEFAULT_NUMERIC_MASK);
      });

      it('should mask string sensitive field values', () => {
        // Arrange
        const testData = '{"password":"secret","username":"mark"}';

        // Act
        const result = JSON.parse(
          stringReplacer(testData, { parseJsonStrings: true }) as string,
        );

        // Assert
        expect(result.password).toBe(DEFAULT_PATTERN_MASK);
      });

      it('should mask sensitive fields at all nesting depths', () => {
        // Arrange
        const testData =
          '{"user":{"password":"secret","email":"mark@example.com"},"id":1}';

        // Act
        const result = JSON.parse(
          stringReplacer(testData, { parseJsonStrings: true }) as string,
        );

        // Assert
        expect(result.user.password).toBe(DEFAULT_PATTERN_MASK);
        expect(result.id).toBe(1);
        expect(result.user.email).toBe('mark@example.com');
      });

      it('should remove sensitive fields including numeric ones when removal is enabled', () => {
        // Arrange
        const testData = '{"password":12345,"username":"mark"}';

        // Act
        const result = JSON.parse(
          stringReplacer(testData, {
            parseJsonStrings: true,
            removeMatches: true,
          }) as string,
        );

        // Assert
        expect(result).toEqual({ username: 'mark' });
      });

      it('should apply a custom numeric mask to number-valued sensitive fields', () => {
        // Arrange
        const testData = '{"password":12345}';

        // Act
        const result = JSON.parse(
          stringReplacer(testData, {
            numericMask: 0,
            parseJsonStrings: true,
          }) as string,
        );

        // Assert
        expect(result.password).toBe(0);
      });

      it('should mask sensitive fields in a JSON array string', () => {
        // Arrange
        const testData = '[{"password":"secret"},{"username":"mark"}]';

        // Act
        const result = JSON.parse(
          stringReplacer(testData, { parseJsonStrings: true }) as string,
        ) as Record<string, unknown>[];

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].password).toBe(DEFAULT_PATTERN_MASK);
        expect(result[1].username).toBe('mark');
      });

      it('should mask form-encoded values in non-JSON strings', () => {
        // Arrange
        const testData = 'password=secret&username=mark';

        // Act
        const result = stringReplacer(testData, {
          parseJsonStrings: true,
        }) as string;

        // Assert
        expect(result).toContain(`password=${DEFAULT_PATTERN_MASK}`);
      });

      it('should mask sensitive fields in malformed JSON strings', () => {
        // Arrange
        const testData = '{"password":"secret"';

        // Act
        const result = stringReplacer(testData, {
          parseJsonStrings: true,
        }) as string;

        // Assert
        expect(result).toContain(`"password":"${DEFAULT_PATTERN_MASK}"`);
      });

      it('should leave a JSON primitive string unchanged', () => {
        // Arrange
        const testData = '"hello world"';

        // Act
        const result = stringReplacer(testData, {
          parseJsonStrings: true,
        }) as string;

        // Assert
        expect(result).toBe('"hello world"');
      });

      it('should produce valid JSON with all sensitive keys masked and safe keys intact', () => {
        // Arrange
        const input = {
          apikey: 'k1',
          city: 'Vancouver',
          country: 'Canada',
          email: 'mark@example.com',
          firstName: 'Mark',
          lastName: 'Smith',
          password: 42,
          postalCode: 'V6B 1A1',
          province: 'BC',
          secret: 'topsecret',
          token: 'tok-abc',
          username: 'mark',
        };
        const testData = JSON.stringify(input);

        // Act
        const sanitized = stringReplacer(testData, {
          parseJsonStrings: true,
        }) as string;
        const parsed = JSON.parse(sanitized) as Record<string, unknown>;

        // Assert
        expect(parsed.apikey).toBe(DEFAULT_PATTERN_MASK);
        expect(parsed.secret).toBe(DEFAULT_PATTERN_MASK);
        expect(parsed.token).toBe(DEFAULT_PATTERN_MASK);
        expect(parsed.password).toBe(DEFAULT_NUMERIC_MASK);
        expect(parsed.username).toBe('mark');
        expect(parsed.email).toBe('mark@example.com');
        expect(parsed.firstName).toBe('Mark');
        expect(parsed.city).toBe('Vancouver');
      });
    });

    describe('with edge case string inputs', () => {
      // The regex path only matches string-quoted values. For each non-string value
      // type below there are two paired tests: the default path documents that the
      // value is left unchanged, and the parseJsonStrings: true path documents that
      // masking works correctly via objectReplacer. When parseJsonStrings defaults
      // to true in v2 the default-path behaviour will change accordingly.
      it('should leave a boolean sensitive field value unchanged', () => {
        // Arrange
        const testData = '{"password":true,"username":"mark"}';

        // Act
        const result = JSON.parse(stringReplacer(testData) as string);

        // Assert
        expect(result.password).toBe(true);
        expect(result.username).toBe('mark');
      });

      it('should mask a sensitive field whose value is a boolean when JSON string parsing is enabled', () => {
        // Arrange
        const testData = '{"password":true,"username":"mark"}';

        // Act
        const result = JSON.parse(
          stringReplacer(testData, { parseJsonStrings: true }) as string,
        );

        // Assert
        expect(result.password).toBe(DEFAULT_PATTERN_MASK);
        expect(result.username).toBe('mark');
      });

      it('should leave a null sensitive field value unchanged', () => {
        // Arrange
        const testData = '{"password":null,"username":"mark"}';

        // Act
        const result = JSON.parse(stringReplacer(testData) as string);

        // Assert
        expect(result.password).toBeNull();
        expect(result.username).toBe('mark');
      });

      it('should mask a sensitive field whose value is null when JSON string parsing is enabled', () => {
        // Arrange
        const testData = '{"password":null,"username":"mark"}';

        // Act
        const result = JSON.parse(
          stringReplacer(testData, { parseJsonStrings: true }) as string,
        );

        // Assert
        expect(result.password).toBe(DEFAULT_PATTERN_MASK);
        expect(result.username).toBe('mark');
      });

      it('should leave an array sensitive field value unchanged', () => {
        // Arrange
        const testData = '{"token":["a","b","c"],"username":"mark"}';

        // Act
        const result = JSON.parse(stringReplacer(testData) as string);

        // Assert
        expect(result.token).toEqual(['a', 'b', 'c']);
        expect(result.username).toBe('mark');
      });

      it('should mask a sensitive field whose value is an array when JSON string parsing is enabled', () => {
        // Arrange
        const testData = '{"token":["a","b","c"],"username":"mark"}';

        // Act
        const result = JSON.parse(
          stringReplacer(testData, { parseJsonStrings: true }) as string,
        );

        // Assert
        expect(result.token).toBe(DEFAULT_PATTERN_MASK);
        expect(result.username).toBe('mark');
      });

      it('should leave a nested object sensitive field value unchanged', () => {
        // Arrange
        const testData = '{"token":{"nested":"value"},"username":"mark"}';

        // Act
        const result = JSON.parse(stringReplacer(testData) as string);

        // Assert
        expect(result.token).toEqual({ nested: 'value' });
        expect(result.username).toBe('mark');
      });

      it('should mask a sensitive field whose value is a nested object when JSON string parsing is enabled', () => {
        // Arrange
        const testData = '{"token":{"nested":"value"},"username":"mark"}';

        // Act
        const result = JSON.parse(
          stringReplacer(testData, { parseJsonStrings: true }) as string,
        );

        // Assert
        expect(result.token).toBe(DEFAULT_PATTERN_MASK);
        expect(result.username).toBe('mark');
      });

      it('should produce valid JSON when a sensitive field value is an empty string', () => {
        // Arrange
        const testData = '{"password":"","username":"mark"}';

        // Act
        const result = stringReplacer(testData) as string;

        // Assert — output must remain parseable and preserve non-sensitive fields
        expect(() => JSON.parse(result)).not.toThrow();
        expect(JSON.parse(result).username).toBe('mark');
      });

      it('should mask a sensitive field whose value is an empty string', () => {
        // Arrange
        const testData = '{"password":"","username":"mark"}';

        // Act
        const result = JSON.parse(
          stringReplacer(testData, { parseJsonStrings: true }) as string,
        );

        // Assert
        expect(result.password).toBe(DEFAULT_PATTERN_MASK);
        expect(result.username).toBe('mark');
      });

      it('should produce valid JSON when a sensitive field value contains an escaped quote', () => {
        // Arrange — value is: sec"ret  (JSON.stringify encodes the inner quote as \")
        const testData = JSON.stringify({
          password: 'sec"ret',
          username: 'mark',
        });

        // Act
        const result = stringReplacer(testData) as string;

        // Assert — output must remain valid JSON with non-sensitive fields preserved
        expect(() => JSON.parse(result)).not.toThrow();
        expect(JSON.parse(result).username).toBe('mark');
      });

      it('should mask a sensitive field whose value contains an embedded quote character', () => {
        // Arrange
        const testData = JSON.stringify({
          password: 'sec"ret',
          username: 'mark',
        });

        // Act
        const result = JSON.parse(
          stringReplacer(testData, { parseJsonStrings: true }) as string,
        );

        // Assert
        expect(result.password).toBe(DEFAULT_PATTERN_MASK);
        expect(result.username).toBe('mark');
      });

      it('should not throw on truncated JSON', () => {
        // Arrange
        const testData = '{"password":';

        // Act + Assert
        expect(() => stringReplacer(testData)).not.toThrow();
        expect(() =>
          stringReplacer(testData, { parseJsonStrings: true }),
        ).not.toThrow();
      });

      it('should not throw on a JSON fragment with no opening brace', () => {
        // Arrange
        const testData = 'password":"secret"}';

        // Act + Assert
        expect(() => stringReplacer(testData)).not.toThrow();
      });

      it('should mask fields in a JSON-like fragment with no wrapping braces', () => {
        // Arrange
        const testData = '"password":"secret","username":"mark"';

        // Act
        const result = stringReplacer(testData) as string;

        // Assert — regex path should still find the key:value pattern
        expect(result).toContain(`"password":"${DEFAULT_PATTERN_MASK}"`);
        expect(result).toContain('"username":"mark"');
      });

      it('should mask a very long sensitive field value', () => {
        // Arrange
        const longValue = 'x'.repeat(10_000);
        const testData = `{"password":"${longValue}","username":"mark"}`;

        // Act
        const result = JSON.parse(stringReplacer(testData) as string);

        // Assert
        expect(result.password).toBe(DEFAULT_PATTERN_MASK);
        expect(result.username).toBe('mark');
      });

      it('should complete within a reasonable time on a very long non-matching string', () => {
        // Arrange
        const testData = 'safe_field=value&'.repeat(5_000);

        // Act
        const start = Date.now();
        stringReplacer(testData);
        const elapsed = Date.now() - start;

        // Assert
        expect(elapsed).toBeLessThan(2_000);
      });

      it('should complete within a reasonable time on a string with many partial-match candidates', () => {
        // Arrange — many field=value pairs none of which match a sensitive pattern
        const testData = Array.from(
          { length: 1_000 },
          (_, i) => `field_${i}=value_${i}`,
        ).join('&');

        // Act
        const start = Date.now();
        stringReplacer(testData);
        const elapsed = Date.now() - start;

        // Assert
        expect(elapsed).toBeLessThan(2_000);
      });

      it('should mask sensitive fields in the inner JSON of a double-encoded string', () => {
        // Arrange — outer JSON wraps a JSON string value containing escaped quotes
        const inner = JSON.stringify({ password: 'secret', user: 'mark' });
        const outer = JSON.stringify({ log: inner, username: 'mark' });

        // Act — escapedJsonMatcher targets \" delimiters in the serialised outer string
        const result = JSON.parse(stringReplacer(outer) as string);

        // Assert
        expect(result.log).not.toContain('secret');
        expect(result.username).toBe('mark');
      });

      it('should mask inner sensitive fields in double-encoded JSON when JSON string parsing is enabled', () => {
        // Arrange
        const inner = JSON.stringify({ password: 'secret', user: 'mark' });
        const outer = JSON.stringify({ log: inner, username: 'mark' });

        // Act — parseJsonStrings parses the outer object; the 'log' string value
        // is sanitized through the regex path which catches the escaped JSON
        const result = JSON.parse(
          stringReplacer(outer, { parseJsonStrings: true }) as string,
        );

        // Assert
        expect(result.log).not.toContain('secret');
        expect(result.username).toBe('mark');
      });

      it('should produce an idempotent result when sanitized twice', () => {
        // Arrange
        const testData =
          '{"password":"secret","api_key":"key123","username":"mark"}';

        // Act
        const once = stringReplacer(testData) as string;
        const twice = stringReplacer(once) as string;

        // Assert — the second pass should not further modify an already-masked string
        expect(twice).toEqual(once);
      });

      it('should handle form-encoded data with an empty field value without throwing', () => {
        // Arrange
        const testData = 'password=&username=mark';

        // Act + Assert
        expect(() => stringReplacer(testData)).not.toThrow();
        const result = stringReplacer(testData) as string;
        expect(result).toContain('username=mark');
      });

      it('should mask a form-encoded value containing base64 padding characters', () => {
        // Arrange — base64-encoded values end with one or two '=' padding characters
        const testData = 'token=abc123==&username=mark';

        // Act
        const result = stringReplacer(testData) as string;

        // Assert
        expect(result).toContain(`token=${DEFAULT_PATTERN_MASK}`);
        expect(result).toContain('username=mark');
      });

      it('should mask all occurrences when a sensitive field appears multiple times', () => {
        // Arrange
        const testData =
          'password=first&password=second&password=third&username=mark';

        // Act
        const result = stringReplacer(testData) as string;

        // Assert
        expect(result).not.toContain('first');
        expect(result).not.toContain('second');
        expect(result).not.toContain('third');
        expect(result).toContain('username=mark');
      });

      it('should mask a sensitive field on one line and preserve all surrounding lines', () => {
        // Arrange
        const testData = [
          'request started',
          'password=hunter2',
          'processing complete',
        ].join('\n');

        // Act
        const result = stringReplacer(testData) as string;

        // Assert
        expect(result).toContain('request started');
        expect(result).toContain(`password=${DEFAULT_PATTERN_MASK}`);
        expect(result).toContain('processing complete');
      });

      it('should mask a JSON value that begins with a unicode escape sequence', () => {
        // Arrange — \\u0073 decodes to 's', making the effective value "secret"
        const testData = '{"password":"\\u0073ecret","username":"mark"}';

        // Act
        const result = JSON.parse(stringReplacer(testData) as string);

        // Assert
        expect(result.password).toBe(DEFAULT_PATTERN_MASK);
        expect(result.username).toBe('mark');
      });

      it('should not mask a value on a non-sensitive key that contains a sensitive word', () => {
        // Arrange — the VALUE contains "password" but the KEY is "message"
        const testData =
          '{"message":"Your password has been reset","username":"mark"}';

        // Act
        const result = JSON.parse(stringReplacer(testData) as string);

        // Assert — jsonMatcher targets key names, not values
        expect(result.message).toBe('Your password has been reset');
        expect(result.username).toBe('mark');
      });

      it('should return unchanged a string containing only a sensitive key name with no delimiter', () => {
        // Arrange
        const testData = 'password';

        // Act
        const result = stringReplacer(testData) as string;

        // Assert
        expect(result).toBe('password');
      });

      it('should mask the value when a form-encoded field contains a URL-encoded ampersand', () => {
        // Arrange — %26 is URL-encoded '&'; should not be treated as a field delimiter
        const testData = 'password=a%26b&username=mark';

        // Act
        const result = stringReplacer(testData) as string;

        // Assert
        expect(result).toContain(`password=${DEFAULT_PATTERN_MASK}`);
        expect(result).toContain('username=mark');
      });

      it('should not throw on a deeply triple-nested JSON string', () => {
        // Arrange
        const level1 = JSON.stringify({ password: 'secret' });
        const level2 = JSON.stringify({ encoded: level1 });
        const level3 = JSON.stringify({ outer: level2 });

        // Act + Assert
        expect(() => stringReplacer(level3)).not.toThrow();
        expect(() =>
          stringReplacer(level3, { parseJsonStrings: true }),
        ).not.toThrow();
      });

      it('should mask string values and leave non-string sensitive field values unchanged', () => {
        // Arrange — mixed-type array: same key with different value types across objects
        const testData = JSON.stringify([
          { password: 'string-secret' },
          { password: 12345 },
          { username: 'mark' },
        ]);

        // Act
        const result = JSON.parse(stringReplacer(testData) as string) as Record<
          string,
          unknown
        >[];

        // Assert — string value is masked; numeric value is left unchanged on the regex path
        expect(result[0]?.password).toBe(DEFAULT_PATTERN_MASK);
        expect(result[1]?.password).toBe(12345);
        expect(result[2]?.username).toBe('mark');
      });

      it('should mask sensitive field values regardless of their type when JSON string parsing is enabled', () => {
        // Arrange
        const testData = JSON.stringify([
          { password: 'string-secret' },
          { password: 12345 },
        ]);

        // Act
        const result = JSON.parse(
          stringReplacer(testData, { parseJsonStrings: true }) as string,
        ) as Record<string, unknown>[];

        // Assert
        expect(result[0]?.password).toBe(DEFAULT_PATTERN_MASK);
        expect(result[1]?.password).toBe(DEFAULT_NUMERIC_MASK);
      });
    });
  });

  describe('objectReplacer', () => {
    describe('when masking sensitive field values', () => {
      it('should mask sensitive fields regardless of value type', () => {
        // Arrange
        const testData = {
          api_key: ['a', 'b'],
          apikey: { nested: true },
          password: 123,
          secret: false,
          token: null,
          username: 'safe',
        };

        // Act
        const result = objectReplacer(testData) as Record<string, unknown>;

        // Assert — number-typed values get DEFAULT_NUMERIC_MASK; all others get DEFAULT_PATTERN_MASK
        expect(result.password).toEqual(DEFAULT_NUMERIC_MASK);
        expect(result.secret).toEqual(DEFAULT_PATTERN_MASK);
        expect(result.token).toEqual(DEFAULT_PATTERN_MASK);
        expect(result.api_key).toEqual(DEFAULT_PATTERN_MASK);
        expect(result.apikey).toEqual(DEFAULT_PATTERN_MASK);
        expect(result.username).toEqual('safe');
      });

      it('should mask repeated sensitive keys at multiple depths', () => {
        // Arrange
        const testData = {
          password: 'top-level',
          profile: {
            password: 'nested',
            sessions: [
              { token: 'session-token', username: 'mark' },
              { metadata: { api_key: 'nested-key' } },
            ],
          },
        };

        // Act
        const result = objectReplacer(testData) as Record<string, unknown>;

        // Assert
        expect(result).toEqual({
          password: DEFAULT_PATTERN_MASK,
          profile: {
            password: DEFAULT_PATTERN_MASK,
            sessions: [
              { token: DEFAULT_PATTERN_MASK, username: 'mark' },
              { metadata: { api_key: DEFAULT_PATTERN_MASK } },
            ],
          },
        });
      });

      it('should mask sensitive fields at any nesting depth', () => {
        // Arrange
        const testData = {
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: {
                    level6: {
                      password: 'deep-secret',
                      visible: 'safe',
                    },
                  },
                },
              },
            },
          },
        };

        // Act
        const result = objectReplacer(testData) as Record<string, unknown>;

        // Assert
        expect(result).toEqual({
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: {
                    level6: {
                      password: DEFAULT_PATTERN_MASK,
                      visible: 'safe',
                    },
                  },
                },
              },
            },
          },
        });
      });

      it('should mask sensitive fields in every element of a large array', () => {
        // Arrange
        const testData = Array.from({ length: 150 }, (_unused, index) => ({
          index,
          token: `token-${index}`,
          username: `user-${index}`,
        }));

        // Act
        const result = objectReplacer(testData) as Record<string, unknown>[];

        // Assert
        expect(result).toHaveLength(150);
        expect(result[0]).toEqual({
          index: 0,
          token: DEFAULT_PATTERN_MASK,
          username: 'user-0',
        });
        expect(result[149]).toEqual({
          index: 149,
          token: DEFAULT_PATTERN_MASK,
          username: 'user-149',
        });
      });

      it('should mask sensitive field values that contain unicode characters', () => {
        // Arrange
        const testData = {
          password: 'paß🔐word',
          username: 'márk',
        };

        // Act
        const result = objectReplacer(testData) as Record<string, unknown>;

        // Assert
        expect(result.password).toEqual(DEFAULT_PATTERN_MASK);
        expect(result.username).toEqual('márk');
      });

      it('should use the default numeric mask for number-valued sensitive fields', () => {
        // Arrange
        const testData = { password: 123, username: 'mark' };

        // Act
        const result = objectReplacer(testData) as Record<string, unknown>;

        // Assert
        expect(result.password).toEqual(DEFAULT_NUMERIC_MASK);
        expect(result.username).toEqual('mark');
      });

      it('should apply a custom numeric mask to number-valued sensitive fields', () => {
        // Arrange
        const testData = { token: 42, username: 'mark' };

        // Act
        const result = objectReplacer(testData, { numericMask: 0 }) as Record<
          string,
          unknown
        >;

        // Assert
        expect(result.token).toEqual(0);
        expect(result.username).toEqual('mark');
      });

      it('should use separate masks for numeric and string sensitive field values', () => {
        // Arrange
        const testData = { password: 123, secret: 'abc', username: 'mark' };

        // Act
        const result = objectReplacer(testData, {
          patternMask: '[REDACTED]',
        }) as Record<string, unknown>;

        // Assert — string value uses patternMask; number value uses DEFAULT_NUMERIC_MASK
        expect(result.password).toEqual(DEFAULT_NUMERIC_MASK);
        expect(result.secret).toEqual('[REDACTED]');
        expect(result.username).toEqual('mark');
      });

      it('should leave number values on non-sensitive keys unchanged', () => {
        // Arrange
        const testData = { count: 5, username: 'mark' };

        // Act
        const result = objectReplacer(testData) as Record<string, unknown>;

        // Assert
        expect(result.count).toEqual(5);
        expect(result.username).toEqual('mark');
      });
    });

    describe('when removing sensitive fields', () => {
      it('should remove sensitive fields regardless of value type', () => {
        // Arrange
        const testData = {
          api_key: ['a', 'b'],
          apikey: { nested: true },
          password: 123,
          secret: false,
          token: null,
          username: 'safe',
        };

        // Act
        const result = objectReplacer(testData, {
          removeMatches: true,
        }) as Record<string, unknown>;

        // Assert
        expect(result).toEqual({ username: 'safe' });
      });
    });

    describe('when configured with custom options', () => {
      it('should return non-object input unchanged', () => {
        // Arrange
        const nonObjectInput = 'password=secret' as unknown as Record<
          string,
          unknown
        >;

        // Act
        const result = objectReplacer(nonObjectInput);

        // Assert
        expect(result).toBe(nonObjectInput);
      });

      it('should support custom patterns when default patterns are disabled', () => {
        // Arrange
        const dataWithCustomPattern = {
          password: 'keep-me',
          ssn: 123456789,
          username: 'safe',
        };

        // Act
        const result = objectReplacer(dataWithCustomPattern, {
          customPatterns: ['ssn'],
          patternMask: '[MASKED]',
          useDefaultPatterns: false,
        }) as Record<string, unknown>;

        // Assert — ssn is a number so gets DEFAULT_NUMERIC_MASK despite custom patternMask
        expect(result).toEqual({
          password: 'keep-me',
          ssn: DEFAULT_NUMERIC_MASK,
          username: 'safe',
        });
      });

      it('should mask only the exact field name when a strict object-form pattern is used', () => {
        // Arrange
        const testData = {
          state: 'secret-state',
          statement: 'not-sensitive',
          username: 'mark',
        };

        // Act
        const result = objectReplacer(testData, {
          customPatterns: [{ match: 'state', strict: true }],
          useDefaultPatterns: false,
        }) as typeof testData;

        // Assert
        expect(result.state).toBe(DEFAULT_PATTERN_MASK);
        expect(result.statement).toBe('not-sensitive');
        expect(result.username).toBe('mark');
      });

      it('should mask substring field names when an object-form pattern omits strict', () => {
        // Arrange
        const testData = {
          state: 'secret-state',
          statement: 'also-sensitive',
          username: 'mark',
        };

        // Act
        const result = objectReplacer(testData, {
          customPatterns: [{ match: 'state' }],
          useDefaultPatterns: false,
        }) as typeof testData;

        // Assert
        expect(result.state).toBe(DEFAULT_PATTERN_MASK);
        expect(result.statement).toBe(DEFAULT_PATTERN_MASK);
        expect(result.username).toBe('mark');
      });

      it('should leave class instances unchanged while masking sensitive fields in plain objects', () => {
        // Arrange
        const date = new Date('2024-01-01');
        const testData = {
          createdAt: date,
          password: 'secret',
          username: 'mark',
        };

        // Act
        const result = objectReplacer(testData) as Record<string, unknown>;

        // Assert
        expect(result.createdAt).toBe(date);
        expect(result.password).toEqual(DEFAULT_PATTERN_MASK);
        expect(result.username).toEqual('mark');
      });

      it('should leave class instances unchanged when they appear as nested values', () => {
        // Arrange
        class SessionRecord {
          token = 'class-token';
        }

        const permissions = new Map([['token', 'map-token']]);
        const labels = new Set(['secret-label']);
        const session = new SessionRecord();
        const testData = {
          labels,
          password: 'plain-secret',
          permissions,
          session,
        };

        // Act
        const result = objectReplacer(testData) as Record<string, unknown>;

        // Assert
        expect(result.permissions).toBe(permissions);
        expect(result.labels).toBe(labels);
        expect(result.session).toBe(session);
        expect(result.password).toEqual(DEFAULT_PATTERN_MASK);
      });

      it('should not copy symbol-keyed properties to the sanitized output', () => {
        // Arrange
        const tokenSymbol = Symbol('token');
        const testData = {
          username: 'mark',
          [tokenSymbol]: 'symbol-secret',
        };

        // Act
        const result = objectReplacer(testData) as Record<string, unknown>;

        // Assert
        expect(result).toEqual({ username: 'mark' });
        expect(Object.getOwnPropertySymbols(result)).toHaveLength(0);
      });
    });

    describe('when scanning string values for embedded sensitive patterns', () => {
      it('should mask sensitive patterns found inside string values on non-sensitive keys', () => {
        // Arrange
        const testData = {
          message: 'api_key=hunter2',
          username: 'mark',
        };

        // Act
        const result = objectReplacer(testData) as Record<string, unknown>;

        // Assert
        expect(result.message).toEqual(`api_key=${DEFAULT_PATTERN_MASK}`);
        expect(result.username).toEqual('mark');
      });

      it('should mask sensitive patterns found in string values at any nesting depth', () => {
        // Arrange
        const testData = {
          config: {
            log: 'connection failed: token=abc123',
            status: 'ok',
          },
        };

        // Act
        const result = objectReplacer(testData) as Record<string, unknown>;

        // Assert
        expect((result.config as Record<string, unknown>).log).toEqual(
          `connection failed: token=${DEFAULT_PATTERN_MASK}`,
        );
        expect((result.config as Record<string, unknown>).status).toEqual('ok');
      });

      it('should mask sensitive patterns in string items inside arrays', () => {
        // Arrange
        const testData = {
          logs: ['api_key=hunter2', 'safe-message'],
        };

        // Act
        const result = objectReplacer(testData) as Record<string, unknown>;

        // Assert
        expect(result.logs).toEqual([
          `api_key=${DEFAULT_PATTERN_MASK}`,
          'safe-message',
        ]);
      });

      it('should remove sensitive patterns found inside string values when removal is enabled', () => {
        // Arrange
        const testData = {
          message: 'api_key=hunter2&username=mark',
          region: 'us-east-1',
        };

        // Act
        const result = objectReplacer(testData, {
          removeMatches: true,
        }) as Record<string, unknown>;

        // Assert
        expect(result.message).toEqual('username=mark');
        expect(result.region).toEqual('us-east-1');
      });

      it('should apply custom matchers when scanning string values for patterns', () => {
        // Arrange
        const testData = {
          authorization: 'Bearer abc123',
          log: 'authorization: Bearer abc123\nuser: mark',
        };

        // Act
        const result = objectReplacer(testData, {
          customMatchers: [headerMatcher],
          customPatterns: ['authorization'],
          useDefaultMatchers: false,
          useDefaultPatterns: false,
        }) as Record<string, unknown>;

        // Assert
        expect(result.authorization).toEqual(DEFAULT_PATTERN_MASK);
        expect(result.log).toEqual(
          `authorization: ${DEFAULT_PATTERN_MASK}\nuser: mark`,
        );
      });

      it('should leave string values unchanged when no patterns match', () => {
        // Arrange
        const testData = {
          message: 'everything looks fine',
          region: 'us-east-1',
        };

        // Act
        const result = objectReplacer(testData) as Record<string, unknown>;

        // Assert
        expect(result.message).toEqual('everything looks fine');
        expect(result.region).toEqual('us-east-1');
      });

      it('should leave string values unchanged when no sensitive patterns are configured', () => {
        // Arrange
        const testData = {
          message: 'api_key=hunter2',
          username: 'mark',
        };

        // Act
        const result = objectReplacer(testData, {
          useDefaultPatterns: false,
        }) as Record<string, unknown>;

        // Assert
        expect(result.message).toEqual('api_key=hunter2');
        expect(result.username).toEqual('mark');
      });

      it('should mask sensitive patterns embedded in a stack trace while preserving the stack frames', () => {
        // Arrange
        const testData = {
          requestId: 'req-abc-123',
          stack: `Error: upstream request failed — api_key=hunter2\n    at authenticate (/app/src/auth.js:89:15)\n    at processRequest (/app/src/handlers.js:134:20)`,
          userId: 'usr-456',
        };

        // Act
        const result = objectReplacer(testData) as Record<string, unknown>;

        // Assert
        expect(result.stack).toEqual(
          `Error: upstream request failed — api_key=${DEFAULT_PATTERN_MASK}\n    at authenticate (/app/src/auth.js:89:15)\n    at processRequest (/app/src/handlers.js:134:20)`,
        );
        expect(result.requestId).toEqual('req-abc-123');
        expect(result.userId).toEqual('usr-456');
      });

      it('should skip string value scanning when the option is disabled', () => {
        // Arrange
        const testData = {
          message: 'api_key=hunter2',
          password: 'secret',
          username: 'mark',
        };

        // Act
        const result = objectReplacer(testData, {
          scanStringValues: false,
        }) as Record<string, unknown>;

        // Assert
        expect(result.message).toEqual('api_key=hunter2');
        expect(result.password).toEqual(DEFAULT_PATTERN_MASK);
        expect(result.username).toEqual('mark');
      });

      it('should apply custom matchers independently even when they share the same factory', () => {
        // Arrange — two matchers built from the same factory with different
        // captured prefixes: matcherA targets a_-prefixed keys, matcherB targets b_-prefixed keys
        const matcherA = makeCustomMatcher('a_');
        const matcherB = makeCustomMatcher('b_');

        const testData = { log: 'a_key=AVALUE&b_key=BVALUE', username: 'mark' };
        const sharedOptions = {
          customPatterns: ['key'],
          useDefaultMatchers: false,
          useDefaultPatterns: false,
        };

        // Act — sanitize with matcherA first, then with matcherB
        objectReplacer(testData, {
          ...sharedOptions,
          customMatchers: [matcherA],
        });
        const result = objectReplacer(testData, {
          ...sharedOptions,
          customMatchers: [matcherB],
        }) as Record<string, unknown>;

        // Assert — matcherB targets b_-prefixed keys only; a_key should be unchanged
        expect(result.log).toContain(`b_key=${DEFAULT_PATTERN_MASK}`);
        expect(result.log).toContain('a_key=AVALUE');
      });

      it('should produce correct results when the same configuration is used again after many others', () => {
        // Arrange — fill the cache past the cap with distinct configs
        const testData = {
          log: 'custom_0=secret&other=safe',
          username: 'mark',
        };
        for (let i = 0; i < STRING_SCAN_CACHE_MAX + 10; i++) {
          objectReplacer(testData, {
            customPatterns: [`custom_${i}`],
            useDefaultPatterns: false,
          });
        }

        // Act
        const result = objectReplacer(testData, {
          customPatterns: ['custom_0'],
          useDefaultPatterns: false,
        }) as Record<string, unknown>;

        // Assert
        expect(result.log).toEqual(
          `custom_0=${DEFAULT_PATTERN_MASK}&other=safe`,
        );
        expect(result.username).toEqual('mark');
      });
    });

    describe('with Map collections', () => {
      it('should leave Maps unchanged by default', () => {
        // Arrange
        const map = new Map<string, unknown>([['password', 'secret']]);

        // Act
        const result = objectReplacer({ data: map }) as Record<string, unknown>;

        // Assert
        expect(result.data).toBe(map);
      });

      it('should return a new Map when collection sanitization is enabled', () => {
        // Arrange
        const map = new Map<string, unknown>([['username', 'mark']]);

        // Act
        const result = objectReplacer(
          { data: map },
          { sanitizeCollections: true },
        ) as Record<string, unknown>;

        // Assert
        expect(result.data).not.toBe(map);
        expect(result.data).toBeInstanceOf(Map);
      });

      it('should mask values whose string keys match sensitive field patterns', () => {
        // Arrange
        const map = new Map<string, unknown>([
          ['password', 'secret'],
          ['username', 'mark'],
        ]);

        // Act
        const result = objectReplacer(
          { data: map },
          { sanitizeCollections: true },
        ) as Record<string, unknown>;
        const sanitized = result.data as Map<string, unknown>;

        // Assert
        expect(sanitized.get('password')).toBe(DEFAULT_PATTERN_MASK);
        expect(sanitized.get('username')).toBe('mark');
      });

      it('should mask numeric values whose string keys match sensitive field patterns', () => {
        // Arrange
        const map = new Map<string, unknown>([['token', 42]]);

        // Act
        const result = objectReplacer(
          { data: map },
          { sanitizeCollections: true },
        ) as Record<string, unknown>;
        const sanitized = result.data as Map<string, unknown>;

        // Assert
        expect(sanitized.get('token')).toBe(DEFAULT_NUMERIC_MASK);
      });

      it('should remove entries whose keys match sensitive field patterns when removal is enabled', () => {
        // Arrange
        const map = new Map<string, unknown>([
          ['password', 'secret'],
          ['username', 'mark'],
        ]);

        // Act
        const result = objectReplacer(
          { data: map },
          { removeMatches: true, sanitizeCollections: true },
        ) as Record<string, unknown>;
        const sanitized = result.data as Map<string, unknown>;

        // Assert
        expect(sanitized.has('password')).toBe(false);
        expect(sanitized.get('username')).toBe('mark');
      });

      it('should mask sensitive patterns found inside string values', () => {
        // Arrange
        const map = new Map<string, unknown>([['message', 'api_key=hunter2']]);

        // Act
        const result = objectReplacer(
          { data: map },
          { sanitizeCollections: true },
        ) as Record<string, unknown>;
        const sanitized = result.data as Map<string, unknown>;

        // Assert
        expect(sanitized.get('message')).toBe(
          `api_key=${DEFAULT_PATTERN_MASK}`,
        );
      });

      it('should mask sensitive fields in plain object values', () => {
        // Arrange
        const map = new Map<string, unknown>([
          ['data', { password: 'secret', username: 'mark' }],
        ]);

        // Act
        const result = objectReplacer(
          { map },
          { sanitizeCollections: true },
        ) as Record<string, unknown>;
        const sanitized = result.map as Map<string, unknown>;
        const nested = sanitized.get('data') as Record<string, unknown>;

        // Assert
        expect(nested.password).toBe(DEFAULT_PATTERN_MASK);
        expect(nested.username).toBe('mark');
      });

      it('should mask sensitive fields inside object keys', () => {
        // Arrange
        const sensitiveKey = { id: 1, password: 'secret' };
        const map = new Map<object, string>([[sensitiveKey, 'value']]);

        // Act
        const result = objectReplacer(
          { data: map },
          { sanitizeCollections: true },
        ) as Record<string, unknown>;
        const sanitized = result.data as Map<Record<string, unknown>, string>;
        const [sanitizedKey] = sanitized.keys();

        // Assert
        expect(sanitizedKey.password).toBe(DEFAULT_PATTERN_MASK);
        expect(sanitizedKey.id).toBe(1);
        expect(sanitized.get(sanitizedKey)).toBe('value');
      });

      it('should mask sensitive fields in nested Maps', () => {
        // Arrange
        const inner = new Map<string, unknown>([['token', 'abc']]);
        const outer = new Map<string, unknown>([['nested', inner]]);

        // Act
        const result = objectReplacer(
          { data: outer },
          { sanitizeCollections: true },
        ) as Record<string, unknown>;
        const sanitizedOuter = result.data as Map<string, unknown>;
        const sanitizedInner = sanitizedOuter.get('nested') as Map<
          string,
          unknown
        >;

        // Assert
        expect(sanitizedInner).toBeInstanceOf(Map);
        expect(sanitizedInner).not.toBe(inner);
        expect(sanitizedInner.get('token')).toBe(DEFAULT_PATTERN_MASK);
      });
    });

    describe('with Set collections', () => {
      it('should leave Sets unchanged by default', () => {
        // Arrange
        const set = new Set(['secret']);

        // Act
        const result = objectReplacer({ data: set }) as Record<string, unknown>;

        // Assert
        expect(result.data).toBe(set);
      });

      it('should return a new Set when collection sanitization is enabled', () => {
        // Arrange
        const set = new Set(['mark']);

        // Act
        const result = objectReplacer(
          { data: set },
          { sanitizeCollections: true },
        ) as Record<string, unknown>;

        // Assert
        expect(result.data).not.toBe(set);
        expect(result.data).toBeInstanceOf(Set);
      });

      it('should mask sensitive patterns in string values', () => {
        // Arrange
        const set = new Set(['api_key=hunter2', 'safe-value']);

        // Act
        const result = objectReplacer(
          { data: set },
          { sanitizeCollections: true },
        ) as Record<string, unknown>;
        const sanitized = result.data as Set<string>;

        // Assert
        expect(sanitized.has(`api_key=${DEFAULT_PATTERN_MASK}`)).toBe(true);
        expect(sanitized.has('safe-value')).toBe(true);
        expect(sanitized.has('api_key=hunter2')).toBe(false);
      });

      it('should mask sensitive fields in plain object values', () => {
        // Arrange
        const obj = { password: 'secret', username: 'mark' };
        const set = new Set([obj]);

        // Act
        const result = objectReplacer(
          { data: set },
          { sanitizeCollections: true },
        ) as Record<string, unknown>;
        const sanitized = result.data as Set<Record<string, unknown>>;
        const [sanitizedObj] = sanitized;

        // Assert
        expect(sanitizedObj.password).toBe(DEFAULT_PATTERN_MASK);
        expect(sanitizedObj.username).toBe('mark');
      });

      it('should mask sensitive fields in Map values contained in the Set', () => {
        // Arrange
        const map = new Map<string, unknown>([['token', 'abc']]);
        const set = new Set([map]);

        // Act
        const result = objectReplacer(
          { data: set },
          { sanitizeCollections: true },
        ) as Record<string, unknown>;
        const sanitized = result.data as Set<Map<string, unknown>>;
        const [sanitizedMap] = sanitized;

        // Assert
        expect(sanitizedMap).toBeInstanceOf(Map);
        expect(sanitizedMap).not.toBe(map);
        expect(sanitizedMap.get('token')).toBe(DEFAULT_PATTERN_MASK);
      });
    });
  });

  describe('ignorePatterns option', () => {
    describe('with object input', () => {
      it('should not mask a field whose default pattern is ignored', () => {
        // Arrange
        const testData = { tokenizer_config: 'bert-base', username: 'mark' };

        // Act
        const result = objectReplacer(testData, {
          ignorePatterns: ['token'],
        }) as typeof testData;

        // Assert
        expect(result.tokenizer_config).toBe('bert-base');
        expect(result.username).toBe('mark');
      });

      it('should still mask other default-pattern fields when one pattern is ignored', () => {
        // Arrange
        const testData = {
          password: 'secret',
          tokenizer_config: 'bert-base',
          username: 'mark',
        };

        // Act
        const result = objectReplacer(testData, {
          ignorePatterns: ['token'],
        }) as typeof testData;

        // Assert
        expect(result.tokenizer_config).toBe('bert-base');
        expect(result.password).toBe(DEFAULT_PATTERN_MASK);
        expect(result.username).toBe('mark');
      });

      it('should not mask a field whose custom pattern is ignored', () => {
        // Arrange
        const testData = { internal_ref: 'ABC123', username: 'mark' };

        // Act
        const result = objectReplacer(testData, {
          customPatterns: ['internal_ref'],
          ignorePatterns: ['internal_ref'],
        }) as typeof testData;

        // Assert
        expect(result.internal_ref).toBe('ABC123');
        expect(result.username).toBe('mark');
      });

      it('should suppress multiple patterns when multiple are ignored', () => {
        // Arrange
        const testData = {
          api_key: 'key123',
          secret: 'shh',
          username: 'mark',
        };

        // Act
        const result = objectReplacer(testData, {
          ignorePatterns: ['api_key', 'secret'],
        }) as typeof testData;

        // Assert
        expect(result.api_key).toBe('key123');
        expect(result.secret).toBe('shh');
        expect(result.username).toBe('mark');
      });

      it('should have no effect when ignorePatterns is an empty array', () => {
        // Arrange
        const testData = { password: 'secret', username: 'mark' };

        // Act
        const result = objectReplacer(testData, {
          ignorePatterns: [],
        }) as typeof testData;

        // Assert
        expect(result.password).toBe(DEFAULT_PATTERN_MASK);
        expect(result.username).toBe('mark');
      });

      it('should remove a field whose default pattern is not ignored when removeMatches is true', () => {
        // Arrange
        const testData = { password: 'secret', username: 'mark' };

        // Act
        const result = objectReplacer(testData, {
          ignorePatterns: ['token'],
          removeMatches: true,
        }) as Record<string, unknown>;

        // Assert
        expect(result).not.toHaveProperty('password');
        expect(result.username).toBe('mark');
      });

      it('should not remove a field whose pattern is in ignorePatterns when removeMatches is true', () => {
        // Arrange
        const testData = { token: 'abc', username: 'mark' };

        // Act
        const result = objectReplacer(testData, {
          ignorePatterns: ['token'],
          removeMatches: true,
        }) as typeof testData;

        // Assert
        expect(result.token).toBe('abc');
        expect(result.username).toBe('mark');
      });

      it('should match ignorePatterns case-insensitively', () => {
        // Arrange
        const testData = { password: 'secret', username: 'mark' };

        // Act
        const result = objectReplacer(testData, {
          ignorePatterns: ['PASSWORD'],
        }) as typeof testData;

        // Assert
        expect(result.password).toBe('secret');
        expect(result.username).toBe('mark');
      });
    });

    describe('with string input', () => {
      it('should not mask a field whose default pattern is ignored', () => {
        // Arrange
        const testData = 'tokenizer_config=bert-base&username=mark';

        // Act
        const result = stringReplacer(testData, {
          ignorePatterns: ['token'],
        });

        // Assert
        expect(result).toBe('tokenizer_config=bert-base&username=mark');
      });

      it('should still mask other default-pattern fields when one pattern is ignored', () => {
        // Arrange
        const testData =
          'tokenizer_config=bert-base&password=secret&username=mark';

        // Act
        const result = stringReplacer(testData, {
          ignorePatterns: ['token'],
        });

        // Assert
        expect(result).toContain('tokenizer_config=bert-base');
        expect(result).toContain(`password=${DEFAULT_PATTERN_MASK}`);
        expect(result).toContain('username=mark');
      });
    });
  });
});
