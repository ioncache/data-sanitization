/* local imports */
import { stringReplacer } from '../src/replacers';
import { DEFAULT_PATTERN_MASK } from '../src/constants';

describe('DataSanitizationReplacers', () => {
  describe('stringReplacer', () => {
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

    it('should remove fields in matched field patterns when the `removeMatches` option is true', () => {
      // Arrange
      const testObject = {
        db_password: 'baz',
        password: 'foo',
        username: 'bar',
      };
      const testData = JSON.stringify(testObject);

      // Act
      const replacedData = stringReplacer(testData, {
        removeMatches: true,
      }) as string;

      // Assert
      expect(replacedData).not.toContain('password');
      expect(replacedData).toContain('username');
    });

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
  });
});
