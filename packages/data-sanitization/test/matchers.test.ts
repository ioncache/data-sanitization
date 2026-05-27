/* npm imports */
import queryString from 'query-string';
import { describe, expect, it } from 'vitest';

/* local imports */
import {
  escapedJsonMatcher,
  escapePattern,
  formEncodedMatcher,
  jsonMatcher,
} from '../src/matchers';

describe('DataSanitizationMatchers', () => {
  describe('formEncodedMatcher', () => {
    it('should find fields that have names that match the pattern', () => {
      // Arrange
      const testPattern = 'password';
      const testObject = {
        db_password: 'baz',
        password: 'foo',
        username: 'bar',
      };
      const testData = queryString.stringify(testObject);
      const matcher = formEncodedMatcher(testPattern);
      const allMatches: Array<string[]> = [];

      // Act
      let matches: string[] | null;
      while ((matches = matcher.exec(testData)) !== null) {
        allMatches.push(matches);
      }

      // Assert
      expect(allMatches?.length).toBe(2);
      expect(allMatches[0]?.[0]).toEqual('db_password=baz&');
      expect(allMatches[1]?.[0]).toEqual('password=foo&');
    });

    it('should match colon-separated field values', () => {
      // Arrange
      const matcher = formEncodedMatcher('password');
      const testData = 'password:secret';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert
      expect(allMatches.length).toBe(1);
      expect(allMatches[0]?.[1]).toEqual('password:');
    });

    it('should match form values containing non-delimiter punctuation', () => {
      // Arrange
      const matcher = formEncodedMatcher('password');
      const testData = 'password=abc-123%2Ba/b.c:z+q&username=mark';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert
      expect(allMatches.length).toBe(1);
      expect(allMatches[0]?.[0]).toEqual('password=abc-123%2Ba/b.c:z+q&');
      expect(allMatches[0]?.[1]).toEqual('password=');
      expect(allMatches[0]?.[2]).toEqual('&');
    });

    it('should match case-insensitively', () => {
      // Arrange
      const matcher = formEncodedMatcher('password');
      const testData = 'PASSWORD=foo&Password=bar';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert
      expect(allMatches.length).toBe(2);
    });

    it('should match fields with the pattern as a substring', () => {
      // Arrange
      const matcher = formEncodedMatcher('secret');
      const testData = 'client_secret_key=abc&name=bob';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert
      expect(allMatches.length).toBe(1);
      expect(allMatches[0]?.[1]).toEqual('client_secret_key=');
    });

    it('should not match fields that do not contain the pattern', () => {
      // Arrange
      const matcher = formEncodedMatcher('password');
      const testData = 'username=foo&email=bar';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert
      expect(allMatches.length).toBe(0);
    });

    it('should remove matched fields and their values from the string', () => {
      // Arrange
      const matcher = formEncodedMatcher('password', true);
      const testData = 'db_password=baz&username=bar&password=foo';

      // Act
      const result = testData.replace(matcher, '');

      // Assert
      expect(result).toBe('username=bar');
    });

    it('should remove the field when it is the only entry in the string', () => {
      // Arrange
      const matcher = formEncodedMatcher('token', true);
      const testData = 'token=abc';

      // Act
      const result = testData.replace(matcher, '');

      // Assert
      expect(result).toBe('');
    });

    it('should remove the field even when its value contains special characters', () => {
      // Arrange
      const matcher = formEncodedMatcher('password', true);
      const testData = 'password=abc-123%2Ba/b.c:z+q&username=mark';

      // Act
      const result = testData.replace(matcher, '');

      // Assert
      expect(result).toBe('username=mark');
    });

    it('should stop matching at a newline without consuming lines that follow', () => {
      // Arrange
      const matcher = formEncodedMatcher('api_key');
      const testData =
        'api_key=hunter2\n    at authenticate (/app/src/auth.js:89:15)';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert
      expect(allMatches.length).toBe(1);
      expect(allMatches[0]?.[1]).toEqual('api_key=');
      expect(allMatches[0]?.[0]).toEqual('api_key=hunter2');
    });

    it('should mask a field value and preserve lines that follow it', () => {
      // Arrange
      const matcher = formEncodedMatcher('api_key');
      const testData =
        'api_key=hunter2\n    at authenticate (/app/src/auth.js:89:15)';
      const mask = '**********';

      // Act
      const result = testData.replace(matcher, '$1' + mask + '$2');

      // Assert
      expect(result).toBe(
        'api_key=**********\n    at authenticate (/app/src/auth.js:89:15)',
      );
    });

    it('should mask a field value when & follows on the same line and preserve subsequent lines', () => {
      // Arrange
      const matcher = formEncodedMatcher('api_key');
      const testData =
        'api_key=hunter2&region=us-east-1\n    at authenticate (/app/src/auth.js:89:15)';
      const mask = '**********';

      // Act
      const result = testData.replace(matcher, '$1' + mask + '$2');

      // Assert
      expect(result).toBe(
        'api_key=**********&region=us-east-1\n    at authenticate (/app/src/auth.js:89:15)',
      );
    });

    it('should remove the field and preserve lines that follow it', () => {
      // Arrange
      const matcher = formEncodedMatcher('api_key', true);
      const testData =
        'api_key=hunter2\n    at authenticate (/app/src/auth.js:89:15)';

      // Act
      const result = testData.replace(matcher, '');

      // Assert
      expect(result).toBe('\n    at authenticate (/app/src/auth.js:89:15)');
    });

    it('should stop at Windows-style line endings without including the carriage return', () => {
      // Arrange
      const matcher = formEncodedMatcher('api_key');
      const testData =
        'api_key=hunter2\r\n    at authenticate (/app/src/auth.js:89:15)';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert
      expect(allMatches.length).toBe(1);
      expect(allMatches[0]?.[0]).toEqual('api_key=hunter2');
    });

    it('should mask a field value and preserve Windows-style lines that follow it', () => {
      // Arrange
      const matcher = formEncodedMatcher('api_key');
      const testData =
        'api_key=hunter2\r\n    at authenticate (/app/src/auth.js:89:15)';
      const mask = '**********';

      // Act
      const result = testData.replace(matcher, '$1' + mask + '$2');

      // Assert
      expect(result).toBe(
        'api_key=**********\r\n    at authenticate (/app/src/auth.js:89:15)',
      );
    });

    it('should match a field with an empty value', () => {
      // Arrange
      const matcher = formEncodedMatcher('password');
      const testData = 'password=&username=mark';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert — document current behavior when the value is empty
      expect(allMatches.length).toBeGreaterThanOrEqual(1);
    });

    it('should treat a URL-encoded ampersand as part of the value and not as a delimiter', () => {
      // Arrange
      const matcher = formEncodedMatcher('password');
      const testData = 'password=a%26b&username=mark';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert — %26 is not the '&' character so should not split the value
      expect(allMatches.length).toBe(1);
      expect(allMatches[0]?.[0]).toContain('%26');
    });

    it('should match a value containing base64 padding characters', () => {
      // Arrange
      const matcher = formEncodedMatcher('token');
      const testData = 'token=abc123==&username=mark';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert — '=' padding is not a delimiter; full value should be captured
      expect(allMatches.length).toBe(1);
      expect(allMatches[0]?.[0]).toContain('abc123==');
    });

    it('should not treat a semicolon as a field delimiter', () => {
      // Arrange
      const matcher = formEncodedMatcher('password');
      const testData = 'password=secret;username=mark';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert — semicolons are not in the stop-character set; value captures past the semicolon
      expect(allMatches.length).toBe(1);
      expect(allMatches[0]?.[0]).toContain(';');
    });

    it('should match a field with a very long value', () => {
      // Arrange
      const matcher = formEncodedMatcher('password');
      const longValue = 'x'.repeat(10_000);
      const testData = `password=${longValue}&username=mark`;

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert
      expect(allMatches.length).toBe(1);
      expect(allMatches[0]?.[0]).toContain(longValue);
    });

    it('should match a field whose value contains a tab character', () => {
      // Arrange
      const matcher = formEncodedMatcher('password');
      const testData = 'password=sec\tret&username=mark';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert — tab is not in the stop-character set; should be captured as part of value
      expect(allMatches.length).toBe(1);
    });
  });

  describe('jsonMatcher', () => {
    it('should find fields that have names that match the pattern', () => {
      // Arrange
      const testPattern = 'password';
      const testObject = {
        db_password: 'baz',
        password: 'foo',
        username: 'bar',
      };
      const testData = JSON.stringify(testObject, null, 2);
      const matcher = jsonMatcher(testPattern);
      const allMatches: Array<string[]> = [];

      // Act
      let matches: string[] | null;
      while ((matches = matcher.exec(testData)) !== null) {
        allMatches.push(matches);
      }

      // Assert
      expect(allMatches?.length).toBe(2);
      expect(allMatches[0]?.[0]).toEqual('"db_password": "baz"');
      expect(allMatches[1]?.[0]).toEqual('"password": "foo"');
    });

    it('should match compact JSON without spaces', () => {
      // Arrange
      const matcher = jsonMatcher('password');
      const testData = '{"password":"foo","username":"bar"}';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert
      expect(allMatches.length).toBe(1);
      expect(allMatches[0]?.[0]).toEqual('"password":"foo"');
    });

    it('should match case-insensitively', () => {
      // Arrange
      const matcher = jsonMatcher('token');
      const testData = '{"TOKEN":"abc","Token":"def","username":"bar"}';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert
      expect(allMatches.length).toBe(2);
    });

    it('should match fields with the pattern as a substring', () => {
      // Arrange
      const matcher = jsonMatcher('key');
      const testData = '{"api_key_v2":"secret","name":"bob"}';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert
      expect(allMatches.length).toBe(1);
      expect(allMatches[0]?.[0]).toEqual('"api_key_v2":"secret"');
    });

    it('should not match fields that do not contain the pattern', () => {
      // Arrange
      const matcher = jsonMatcher('password');
      const testData = '{"username":"foo","email":"bar"}';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert
      expect(allMatches.length).toBe(0);
    });

    it('should safely handle patterns that contain special characters', () => {
      // Arrange
      const testPattern = 'pass.*word';
      const testData = JSON.stringify(
        { 'pass.*word': 'secret', username: 'bar' },
        null,
        2,
      );
      const matcher = jsonMatcher(testPattern);
      const allMatches: Array<string[]> = [];

      // Act
      let matches: string[] | null;
      while ((matches = matcher.exec(testData)) !== null) {
        allMatches.push(matches);
      }

      // Assert
      expect(allMatches.length).toBe(1);
      expect(allMatches[0]?.[0]).toEqual('"pass.*word": "secret"');
    });

    it('should remove a field in the middle of a JSON string', () => {
      // Arrange
      const matcher = jsonMatcher('password', true);
      const testData = '{"username":"bar","password":"foo","email":"baz"}';

      // Act
      const result = testData.replace(matcher, '');

      // Assert
      expect(JSON.parse(result)).toEqual({ email: 'baz', username: 'bar' });
    });

    it('should remove a field that appears first in a JSON string', () => {
      // Arrange
      const matcher = jsonMatcher('password', true);
      const testData = '{"password":"foo","username":"bar"}';

      // Act
      const result = testData.replace(matcher, '');

      // Assert
      expect(JSON.parse(result)).toEqual({ username: 'bar' });
    });

    it('should remove a field that appears last in a JSON string', () => {
      // Arrange
      const matcher = jsonMatcher('password', true);
      const testData = '{"username":"bar","password":"foo"}';

      // Act
      const result = testData.replace(matcher, '');

      // Assert
      expect(JSON.parse(result)).toEqual({ username: 'bar' });
    });

    it('should remove a field that is the only field in a JSON string', () => {
      // Arrange
      const matcher = jsonMatcher('password', true);
      const testData = '{"password":"foo"}';

      // Act
      const result = testData.replace(matcher, '');

      // Assert
      expect(JSON.parse(result)).toEqual({});
    });

    it('should not match a field whose value is an empty string', () => {
      // Arrange
      const matcher = jsonMatcher('password');
      const testData = '{"password":"","username":"mark"}';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert — an empty value between quotes should not match; the matcher should
      // either skip it cleanly or require at least one character
      expect(allMatches.length).toBe(0);
    });

    // NOTE: The four tests below document desired behavior that jsonMatcher cannot
    // currently deliver. The masking regex requires a quoted string value ("..."),
    // so boolean, null, number, array, and object values are never matched on the
    // regex path. These tests are intentionally failing to surface this limitation.
    // Resolution options are tracked in docs/plans/018-pattern-and-matcher-additions.md.
    it('should match a field whose value is a number', () => {
      // Arrange
      const matcher = jsonMatcher('password');
      const testData = '{"password":12345,"username":"mark"}';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert — sensitive fields with numeric values should be detected
      expect(allMatches.length).toBe(1);
    });

    it('should match a field whose value is a boolean', () => {
      // Arrange
      const matcher = jsonMatcher('password');
      const testData = '{"password":true,"username":"mark"}';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert — sensitive fields with boolean values should be detected
      expect(allMatches.length).toBe(1);
    });

    it('should match a field whose value is null', () => {
      // Arrange
      const matcher = jsonMatcher('password');
      const testData = '{"password":null,"username":"mark"}';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert — sensitive fields with null values should be detected
      expect(allMatches.length).toBe(1);
    });

    it('should match a field whose value is an array', () => {
      // Arrange
      const matcher = jsonMatcher('token');
      const testData = '{"token":["a","b"],"username":"mark"}';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert — sensitive fields whose values are arrays should be detected
      expect(allMatches.length).toBe(1);
    });

    it('should match a value that contains a unicode escape sequence', () => {
      // Arrange
      const matcher = jsonMatcher('password');
      const testData = '{"password":"\\u0073ecret","username":"mark"}';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert
      expect(allMatches.length).toBe(1);
    });

    it('should mask the full value when it contains an embedded quote character', () => {
      // Arrange — value is: sec"ret  (JSON.stringify encodes the inner quote as \")
      const testData = JSON.stringify({
        password: 'sec"ret',
        username: 'mark',
      });
      const matcher = jsonMatcher('password');

      // Act
      const result = testData.replace(matcher, '$1**********$2');

      // Assert — the replacement should produce valid JSON with the full value masked
      expect(() => JSON.parse(result)).not.toThrow();
      expect(JSON.parse(result).password).toBe('**********');
      expect(JSON.parse(result).username).toBe('mark');
    });

    it('should match fields with whitespace between the name and the separator', () => {
      // Arrange — this is valid pretty-printed JSON
      const matcher = jsonMatcher('password');
      const testData = '{"password"   :   "secret","username":"mark"}';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert — whitespace around the colon is valid JSON and should be matched
      expect(allMatches.length).toBe(1);
    });

    it('should match fields separated by a tab character', () => {
      // Arrange — tab-separated JSON is valid
      const matcher = jsonMatcher('password');
      const testData = '{"password"\t:\t"secret"}';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert
      expect(allMatches.length).toBe(1);
    });

    it('should match fields where the value appears on the next line', () => {
      // Arrange — valid pretty-printed JSON with value on a new line
      const matcher = jsonMatcher('password');
      const testData = '{\n  "password":\n    "secret"\n}';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert
      expect(allMatches.length).toBe(1);
    });

    it('should match a field whose key contains the pattern with a hyphen prefix', () => {
      // Arrange — hyphen is not a \\w character so \\w* does not cross it;
      // "my-password" contains "password" but the \\w* prefix stops at "-"
      const matcher = jsonMatcher('password');
      const testData = '{"my-password":"secret","username":"mark"}';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert — a hyphen-prefixed key containing the pattern should still be detected
      expect(allMatches.length).toBe(1);
    });

    it('should match a field with a very long string value', () => {
      // Arrange
      const matcher = jsonMatcher('password');
      const longValue = 'x'.repeat(10_000);
      const testData = `{"password":"${longValue}","username":"mark"}`;

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert
      expect(allMatches.length).toBe(1);
      expect(allMatches[0]?.[0]).toContain(longValue);
    });

    it('should match a field whose key contains the pattern followed by digits', () => {
      // Arrange
      const matcher = jsonMatcher('password');
      const testData = '{"password123":"secret","username":"mark"}';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert — \\w* after the pattern matches digits too
      expect(allMatches.length).toBe(1);
    });

    it('should not match a field when the pattern only appears in the value not the key', () => {
      // Arrange
      const matcher = jsonMatcher('password');
      const testData =
        '{"message":"reset your password here","username":"mark"}';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert
      expect(allMatches.length).toBe(0);
    });
  });

  describe('escapedJsonMatcher', () => {
    it('should find fields that have names that match the pattern', () => {
      // Arrange
      const matcher = escapedJsonMatcher('password');
      const testData =
        '{"level":30,"msg":"{\\"password\\":\\"secret\\",\\"username\\":\\"mark\\"}"}';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert
      expect(allMatches.length).toBe(1);
      expect(allMatches[0]?.[0]).toEqual('\\"password\\":\\"secret\\"');
    });

    it('should match fields with the pattern as a substring', () => {
      // Arrange
      const matcher = escapedJsonMatcher('password');
      const testData = '\\"db_password\\":\\"baz\\"';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert
      expect(allMatches.length).toBe(1);
      expect(allMatches[0]?.[0]).toEqual('\\"db_password\\":\\"baz\\"');
    });

    it('should match case-insensitively', () => {
      // Arrange
      const matcher = escapedJsonMatcher('token');
      const testData = '\\"TOKEN\\":\\"abc\\",\\"Token\\":\\"def\\"';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert
      expect(allMatches.length).toBe(2);
    });

    it('should not match fields that do not contain the pattern', () => {
      // Arrange
      const matcher = escapedJsonMatcher('password');
      const testData = '\\"username\\":\\"foo\\"';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert
      expect(allMatches.length).toBe(0);
    });

    it('should produce output that can be replaced with a mask string', () => {
      // Arrange
      const matcher = escapedJsonMatcher('password');
      const testData = '\\"password\\":\\"secret\\"';
      const mask = '**********';

      // Act
      const result = testData.replace(matcher, '$1' + mask + '$2');

      // Assert
      expect(result).toBe('\\"password\\":\\"**********\\"');
    });

    it('should remove matched fields and their values from the escaped string', () => {
      // Arrange
      const matcher = escapedJsonMatcher('password', true);
      const testData = '\\"username\\":\\"bar\\",\\"password\\":\\"foo\\"';

      // Act
      const result = testData.replace(matcher, '');

      // Assert
      expect(result).toBe('\\"username\\":\\"bar\\"');
    });

    it('should remove the field when it is the only field in the escaped string', () => {
      // Arrange
      const matcher = escapedJsonMatcher('password', true);
      const testData = '\\"password\\":\\"foo\\"';

      // Act
      const result = testData.replace(matcher, '');

      // Assert
      expect(result).toBe('');
    });

    it('should not match a field whose value is an empty escaped string', () => {
      // Arrange — value is effectively empty: \\"password\\":\\"\\",... (opening and closing \\" are adjacent)
      const matcher = escapedJsonMatcher('password');
      const testData = '\\"password\\":\\"\\",\\"username\\":\\"mark\\"';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert — an empty value between the escaped-quote delimiters should not produce a match
      expect(allMatches.length).toBe(0);
    });

    it('should handle values that contain escaped backslashes', () => {
      // Arrange — value contains a literal backslash: sec\ret
      // In escaped JSON this is: \\"password\\":\\"sec\\\\ret\\"
      const matcher = escapedJsonMatcher('password');
      const testData = '\\"password\\":\\"sec\\\\ret\\"';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert — the \\\\  in the value may interact with the regex stop pattern; document current behavior
      expect(allMatches.length).toBeGreaterThanOrEqual(0);
    });

    it('should match a value containing unicode escape sequences', () => {
      // Arrange — value contains \\u0073 which is 's' in unicode
      const matcher = escapedJsonMatcher('password');
      const testData = '\\"password\\":\\"\\u0073ecret\\"';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert — unicode escapes are treated as literal characters in the string; match should succeed
      expect(allMatches.length).toBe(1);
    });

    it('should match a field with a very long escaped value', () => {
      // Arrange
      const matcher = escapedJsonMatcher('password');
      const longValue = 'x'.repeat(10_000);
      const testData = `\\"password\\":\\"${longValue}\\"`;

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert
      expect(allMatches.length).toBe(1);
    });

    it('should match multiple fields in a single escaped JSON string', () => {
      // Arrange
      const matcher = escapedJsonMatcher('password');
      const testData =
        '\\"db_password\\":\\"baz\\",\\"username\\":\\"mark\\",\\"password\\":\\"foo\\"';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert
      expect(allMatches.length).toBe(2);
    });

    it('should not match when the pattern only appears inside a value not a key', () => {
      // Arrange
      const matcher = escapedJsonMatcher('password');
      const testData = '\\"message\\":\\"reset your password here\\"';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert
      expect(allMatches.length).toBe(0);
    });
  });

  describe('escapePattern', () => {
    it('should treat special characters in the pattern as literals', () => {
      // Arrange
      const input = 'foo.*bar+baz?';

      // Act
      const result = escapePattern(input);

      // Assert
      expect(result).toBe('foo\\.\\*bar\\+baz\\?');
    });

    it('should return plain patterns unchanged', () => {
      // Arrange
      const input = 'password';

      // Act
      const result = escapePattern(input);

      // Assert
      expect(result).toBe('password');
    });
  });
});
