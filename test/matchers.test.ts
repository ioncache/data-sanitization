/* npm imports */
import queryString from 'query-string';

/* local imports */
import { formEncodedMatcher, jsonMatcher } from '~/matchers';

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
  });
});
