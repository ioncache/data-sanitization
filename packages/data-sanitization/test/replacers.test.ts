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

      it('should reuse compiled custom matcher regexes for repeated string sanitization', () => {
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

    describe('parseJsonStrings option', () => {
      it('should leave numeric sensitive fields unmasked without the option', () => {
        // Arrange
        const testData = '{"password":12345,"username":"mark"}';

        // Act
        const result = JSON.parse(stringReplacer(testData) as string);

        // Assert
        expect(result.password).toBe(12345);
      });

      it('should mask a numeric sensitive field when parseJsonStrings is true', () => {
        // Arrange
        const testData = '{"password":12345,"username":"mark"}';

        // Act
        const result = JSON.parse(
          stringReplacer(testData, { parseJsonStrings: true }) as string,
        );

        // Assert
        expect(result.password).toBe(DEFAULT_NUMERIC_MASK);
      });

      it('should mask a string sensitive field when parseJsonStrings is true', () => {
        // Arrange
        const testData = '{"password":"secret","username":"mark"}';

        // Act
        const result = JSON.parse(
          stringReplacer(testData, { parseJsonStrings: true }) as string,
        );

        // Assert
        expect(result.password).toBe(DEFAULT_PATTERN_MASK);
      });

      it('should sanitize a nested object at all depths when parseJsonStrings is true', () => {
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

      it('should remove numeric sensitive fields when removeMatches is true', () => {
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

      it('should apply a custom numericMask to numeric sensitive fields when parseJsonStrings is true', () => {
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

      it('should sanitize a top-level JSON array when parseJsonStrings is true', () => {
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

      it('should fall back to regex for non-JSON strings when parseJsonStrings is true', () => {
        // Arrange
        const testData = 'password=secret&username=mark';

        // Act
        const result = stringReplacer(testData, {
          parseJsonStrings: true,
        }) as string;

        // Assert
        expect(result).toContain(`password=${DEFAULT_PATTERN_MASK}`);
      });

      it('should fall back to regex for invalid JSON when parseJsonStrings is true', () => {
        // Arrange
        const testData = '{"password":"secret"';

        // Act
        const result = stringReplacer(testData, {
          parseJsonStrings: true,
        }) as string;

        // Assert
        expect(result).toContain(`"password":"${DEFAULT_PATTERN_MASK}"`);
      });

      it('should leave a valid JSON primitive string unchanged when parseJsonStrings is true', () => {
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

    describe('adversarial string inputs', () => {
      it('should mask a boolean sensitive field value on the regex path', () => {
        // Arrange
        const testData = '{"password":true,"username":"mark"}';

        // Act
        const result = JSON.parse(stringReplacer(testData) as string);

        // Assert
        expect(result.password).toBe(DEFAULT_PATTERN_MASK);
        expect(result.username).toBe('mark');
      });

      it('should mask a boolean sensitive field value when parseJsonStrings is true', () => {
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

      it('should mask a null sensitive field value on the regex path', () => {
        // Arrange
        const testData = '{"password":null,"username":"mark"}';

        // Act
        const result = JSON.parse(stringReplacer(testData) as string);

        // Assert
        expect(result.password).toBe(DEFAULT_PATTERN_MASK);
        expect(result.username).toBe('mark');
      });

      it('should mask a null sensitive field value when parseJsonStrings is true', () => {
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

      it('should mask an array sensitive field value on the regex path', () => {
        // Arrange
        const testData = '{"token":["a","b","c"],"username":"mark"}';

        // Act
        const result = JSON.parse(stringReplacer(testData) as string);

        // Assert
        expect(result.token).toBe(DEFAULT_PATTERN_MASK);
        expect(result.username).toBe('mark');
      });

      it('should mask an array sensitive field value when parseJsonStrings is true', () => {
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

      it('should mask an object sensitive field value on the regex path', () => {
        // Arrange
        const testData = '{"token":{"nested":"value"},"username":"mark"}';

        // Act
        const result = JSON.parse(stringReplacer(testData) as string);

        // Assert
        expect(result.token).toBe(DEFAULT_PATTERN_MASK);
        expect(result.username).toBe('mark');
      });

      it('should mask an object sensitive field value when parseJsonStrings is true', () => {
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

      it('should mask an empty string sensitive field value when parseJsonStrings is true', () => {
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

      it('should mask a JSON value containing an escaped quote when parseJsonStrings is true', () => {
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

      it('should mask inner sensitive fields in double-encoded JSON when parseJsonStrings is true', () => {
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

      it('should mask only the sensitive field when semicolons delimit form-encoded fields', () => {
        // Arrange — some HTTP clients use semicolons as query string separators (RFC 3986 §3.4)
        const testData = 'password=secret;username=mark';

        // Act
        const result = stringReplacer(testData) as string;

        // Assert — only the password value should be masked; username should be preserved intact
        expect(result).toContain(`password=${DEFAULT_PATTERN_MASK}`);
        expect(result).toContain('username=mark');
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

      it('should mask both string and number values for the same key pattern on the regex path', () => {
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

        // Assert — all sensitive-key values should be masked regardless of type
        expect(result[0]?.password).toBe(DEFAULT_PATTERN_MASK);
        expect(result[1]?.password).toBe(DEFAULT_PATTERN_MASK);
        expect(result[2]?.username).toBe('mark');
      });

      it('should mask both string and number values for the same key pattern when parseJsonStrings is true', () => {
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
    describe('masking', () => {
      it('should mask sensitive object keys with non-string values', () => {
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

      it('should mask sensitive keys in deeply nested objects', () => {
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

      it('should mask sensitive keys in larger arrays', () => {
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

      it('should mask unicode sensitive object values', () => {
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

      it('should mask number-valued sensitive keys with the default numeric mask', () => {
        // Arrange
        const testData = { password: 123, username: 'mark' };

        // Act
        const result = objectReplacer(testData) as Record<string, unknown>;

        // Assert
        expect(result.password).toEqual(DEFAULT_NUMERIC_MASK);
        expect(result.username).toEqual('mark');
      });

      it('should mask number-valued sensitive keys with a custom numericMask', () => {
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

      it('should apply numericMask independently of patternMask', () => {
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

      it('should leave non-sensitive number-valued keys untouched', () => {
        // Arrange
        const testData = { count: 5, username: 'mark' };

        // Act
        const result = objectReplacer(testData) as Record<string, unknown>;

        // Assert
        expect(result.count).toEqual(5);
        expect(result.username).toEqual('mark');
      });
    });

    describe('removal', () => {
      it('should remove sensitive object keys with non-string values', () => {
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

    describe('options', () => {
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

      it('should preserve non-plain objects without corrupting their type', () => {
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

      it('should preserve nested non-plain object instances', () => {
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

      it('should omit symbol-keyed properties from sanitized object clones', () => {
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

    describe('string-value scanning', () => {
      it('should scan string values on non-sensitive keys for embedded patterns', () => {
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

      it('should scan string values at any nesting depth', () => {
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

      it('should scan string items inside arrays under non-sensitive keys', () => {
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

      it('should remove embedded patterns in string values when removeMatches is true', () => {
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

      it('should scan string values using custom matchers', () => {
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

      it('should leave string values unchanged when no patterns are configured', () => {
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

      it('should mask embedded sensitive patterns in a stack trace string and preserve stack frames', () => {
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

      it('should not scan string values when scanStringValues is false', () => {
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

      it('should apply each custom matcher independently when matchers differ in captured state', () => {
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

      it('should produce correct results when a config is reused after many other configs have been used', () => {
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

    describe('Map sanitization', () => {
      it('should pass through Map unchanged when sanitizeCollections is not enabled', () => {
        // Arrange
        const map = new Map<string, unknown>([['password', 'secret']]);

        // Act
        const result = objectReplacer({ data: map }) as Record<string, unknown>;

        // Assert
        expect(result.data).toBe(map);
      });

      it('should return a new Map instance when sanitizeCollections is true', () => {
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

      it('should mask string value when string key matches sensitive field pattern', () => {
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

      it('should mask numeric value with numericMask when string key matches sensitive field pattern', () => {
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

      it('should omit entry when removeMatches is true and string key matches', () => {
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

      it('should scan string values on non-sensitive keys for embedded patterns', () => {
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

      it('should sanitize plain object values recursively', () => {
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

      it('should sanitize object keys recursively', () => {
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

      it('should sanitize nested Maps', () => {
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

    describe('Set sanitization', () => {
      it('should pass through Set unchanged when sanitizeCollections is not enabled', () => {
        // Arrange
        const set = new Set(['secret']);

        // Act
        const result = objectReplacer({ data: set }) as Record<string, unknown>;

        // Assert
        expect(result.data).toBe(set);
      });

      it('should return a new Set instance when sanitizeCollections is true', () => {
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

      it('should scan string values for embedded sensitive patterns', () => {
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

      it('should sanitize plain object values recursively', () => {
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

      it('should sanitize Map values within a Set', () => {
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
});
