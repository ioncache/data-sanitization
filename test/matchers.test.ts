/* npm imports */
import queryString from 'query-string';
import { describe, expect, it } from 'vitest';

/* local imports */
import {
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

    it('should match colon-delimited fields', () => {
      // Arrange
      const matcher = formEncodedMatcher('password');
      const testData = 'password:secret';

      // Act
      const allMatches = [...testData.matchAll(matcher)];

      // Assert
      expect(allMatches.length).toBe(1);
      expect(allMatches[0]?.[1]).toEqual('password:');
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

    it('should produce a removal regex that cleanly removes matched fields', () => {
      // Arrange
      const matcher = formEncodedMatcher('password', true);
      const testData = 'db_password=baz&username=bar&password=foo';

      // Act
      const result = testData.replace(matcher, '');

      // Assert
      expect(result).toBe('username=bar');
    });

    it('should produce a removal regex that handles a single field', () => {
      // Arrange
      const matcher = formEncodedMatcher('token', true);
      const testData = 'token=abc';

      // Act
      const result = testData.replace(matcher, '');

      // Assert
      expect(result).toBe('');
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

    it('should safely handle patterns containing regex metacharacters', () => {
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

    it('should produce a removal regex that cleanly removes a middle field', () => {
      // Arrange
      const matcher = jsonMatcher('password', true);
      const testData = '{"username":"bar","password":"foo","email":"baz"}';

      // Act
      const result = testData.replace(matcher, '');

      // Assert
      expect(JSON.parse(result)).toEqual({ username: 'bar', email: 'baz' });
    });

    it('should produce a removal regex that cleanly removes the first field', () => {
      // Arrange
      const matcher = jsonMatcher('password', true);
      const testData = '{"password":"foo","username":"bar"}';

      // Act
      const result = testData.replace(matcher, '');

      // Assert
      expect(JSON.parse(result)).toEqual({ username: 'bar' });
    });

    it('should produce a removal regex that cleanly removes the last field', () => {
      // Arrange
      const matcher = jsonMatcher('password', true);
      const testData = '{"username":"bar","password":"foo"}';

      // Act
      const result = testData.replace(matcher, '');

      // Assert
      expect(JSON.parse(result)).toEqual({ username: 'bar' });
    });

    it('should produce a removal regex that cleanly removes the only field', () => {
      // Arrange
      const matcher = jsonMatcher('password', true);
      const testData = '{"password":"foo"}';

      // Act
      const result = testData.replace(matcher, '');

      // Assert
      expect(JSON.parse(result)).toEqual({});
    });
  });

  describe('escapePattern', () => {
    it('should escape regex metacharacters in a pattern string', () => {
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
