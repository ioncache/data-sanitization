/* npm imports */
import queryString from 'query-string';

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
