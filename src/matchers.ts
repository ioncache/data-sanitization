import { DataSanitizationMatcher } from '~/types';

/**
 * Matches field names in url form encoded data, or other types of
 * data similarly character delimited
 *
 * NOTE: this can partially fail if a non-word character is found
 *       before the end of the value is reached, but in that case
 *       it will still partially mask the value
 *
 * @example
 * // when masked: 'password=mask'
 * formEncodedMatcher('password=foo')
 *
 * @example
 * // when masked: 'password=mask&'
 * formEncodedMatcher('password=foo&')
 *
 * @example
 * // when masked: 'db_password=mask'
 * formEncodedMatcher('db_password=foo')
 *
 * * @example
 * // when masked: 'db_password=mask&password=mask'
 * formEncodedMatcher('db_password=foo&password=bar')
 *
 * @example
 * // when masked: 'This_Is_a_Password_Field=mask'
 * formEncodedMatcher('This_Is_a_Password_Field=foo')
 *
 * @example
 * // when masked: 'password:mask'
 * formEncodedMatcher('password:bar')
 *
 * @param pattern A pattern in url form encoded like data used to match against field names
 */
const formEncodedMatcher: DataSanitizationMatcher = (pattern) =>
  new RegExp(`(\\w*${pattern}\\w*[=:])(?:\\W?.*?)([\\W]|$)`, 'gi');

/**
 * Matches field names in json/json-like structured data
 *
 * @example
 * //when masked: '"password":"mask'
 * jsonMatch('"password":"foo"')
 *
 * @example
 * // when masked: '"password":"mask"'
 * jsonMatch('"password": "foo"')
 *
 * @example
 * // when masked: '"password":"mask","username":"bar"'
 * jsonMatch('"password":"foo","username":"bar"')
 *
 * @example
 * // when masked: '"db_password":"mask"'
 * jsonMatch('"db_password":"foo"')
 *
 * @example
 * // when masked: '"db_password":"mask","password":"mask"'
 * jsonMatch('"db_password":"foo","password":"bar"')
 *
 * @example
 * // when masked: '"This_Is_a_Password_Field":"mask"'
 * jsonMatch('"This_Is_a_Password_Field":"foo"')
 *
 * @param pattern A pattern in json-like data used to match against field names
 */
const jsonMatcher: DataSanitizationMatcher = (pattern) =>
  new RegExp(`("\\w*${pattern}\\w*"?:\\s*").+?(")`, 'gi');

const defaultMatchers = [formEncodedMatcher, jsonMatcher];

export { defaultMatchers, formEncodedMatcher, jsonMatcher };

export default defaultMatchers;
