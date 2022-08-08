/* local imports */
import { stringReplacer } from '~/replacers';
import { DEFAULT_PATTERN_MASK } from '~/constants';

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
      const replacedData = stringReplacer(testData);
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
      const replacedData = stringReplacer(testData, { removeMatches: true });
      console.log(
        '🚀 ~ file: replacers.test.ts ~ line 37 ~ it ~ replacedData',
        replacedData,
      );
      const replacedObject = JSON.parse(replacedData);

      // Assert
      expect(replacedObject.password).toEqual(DEFAULT_PATTERN_MASK);
      expect(replacedObject.db_password).toEqual(DEFAULT_PATTERN_MASK);
      expect(replacedObject.username).toEqual('bar');
    });
  });
});
