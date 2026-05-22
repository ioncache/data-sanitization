/* npm imports */
import { describe, expect, it } from 'vitest';

/* local imports */
import { objectReplacer, stringReplacer } from '../src/replacers';
import { DEFAULT_NUMERIC_MASK, DEFAULT_PATTERN_MASK } from '../src/constants';

const headerMatcher = (pattern: string) =>
  new RegExp(
    `(${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*).+?(\\n|$)`,
    'gi',
  );

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

      it('should treat two closures with identical source but different captured state as distinct cache entries', () => {
        // Arrange — same factory produces closures with identical source text but
        // different captured prefix; toString()-based keys would collide and use
        // the first closure's regexes for all subsequent calls with identical source
        const makeCustomMatcher =
          (prefix: string) =>
          (pattern: string): RegExp =>
            // Group 1: prefix+key+delimiter, Group 2: trailing & or end-of-string
            new RegExp(`(${prefix}${pattern}=)[^&\\n]+(&|$)`, 'gi');

        const matcherA = makeCustomMatcher('a_');
        const matcherB = makeCustomMatcher('b_');

        const testData = { log: 'a_key=AVALUE&b_key=BVALUE', username: 'mark' };
        const sharedOptions = {
          customPatterns: ['key'],
          useDefaultMatchers: false,
          useDefaultPatterns: false,
        };

        // Act — prime the cache with matcherA, then apply matcherB
        objectReplacer(testData, {
          ...sharedOptions,
          customMatchers: [matcherA],
        });
        const result = objectReplacer(testData, {
          ...sharedOptions,
          customMatchers: [matcherB],
        }) as Record<string, unknown>;

        // Assert — matcherB should mask b_key only; a cache collision would
        // return matcherA's regexes and mask a_key instead
        expect(result.log).toContain(`b_key=${DEFAULT_PATTERN_MASK}`);
        expect(result.log).toContain('a_key=AVALUE');
      });

      it('should return correct results after string-scan cache eviction', () => {
        // Arrange — fill the cache past the 10-entry cap with distinct configs
        const testData = {
          log: 'custom_0=secret&other=safe',
          username: 'mark',
        };
        for (let i = 0; i < 11; i++) {
          objectReplacer(testData, {
            customPatterns: [`custom_${i}`],
            useDefaultPatterns: false,
          });
        }

        // Act — re-use the first config, which was evicted; must still work
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
  });
});
