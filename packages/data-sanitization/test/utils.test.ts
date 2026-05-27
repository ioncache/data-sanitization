/* npm imports */
import { describe, expect, it } from 'vitest';

/* local imports */
import { diffSanitizedFields, buildSanitizedWarning } from '../src/utils';

describe('DataSanitizationUtils', () => {
  describe('diffSanitizedFields', () => {
    it('should return empty array when objects are identical', () => {
      // Arrange
      const original = { level: 30, msg: 'hi' };
      const sanitized = { level: 30, msg: 'hi' };

      // Act
      const result = diffSanitizedFields(original, sanitized);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return the key name when the changed field is at the root level', () => {
      // Arrange
      const original = { email: 'a@b.com', msg: 'hi' };
      const sanitized = { email: '**********', msg: 'hi' };

      // Act
      const result = diffSanitizedFields(original, sanitized);

      // Assert
      expect(result).toEqual(['email']);
    });

    it('should return a dot-separated path for a changed key inside a nested object', () => {
      // Arrange
      const original = { msg: 'hi', user: { email: 'a@b.com' } };
      const sanitized = { msg: 'hi', user: { email: '**********' } };

      // Act
      const result = diffSanitizedFields(original, sanitized);

      // Assert
      expect(result).toEqual(['user.email']);
    });

    it('should return indexed paths for changed elements inside an array', () => {
      // Arrange
      const original = { tokens: ['abc', 'def'] };
      const sanitized = { tokens: ['**********', '**********'] };

      // Act
      const result = diffSanitizedFields(original, sanitized);

      // Assert
      expect(result).toEqual(['tokens[0]', 'tokens[1]']);
    });

    it('should return an indexed path to a changed field inside an array element', () => {
      // Arrange
      const original = { users: [{ email: 'a@b.com', name: 'Alice' }] };
      const sanitized = { users: [{ email: '**********', name: 'Alice' }] };

      // Act
      const result = diffSanitizedFields(original, sanitized);

      // Assert
      expect(result).toEqual(['users[0].email']);
    });

    it('should include path when key is present in original but absent in sanitized', () => {
      // Arrange
      const original = { password: 'secret', username: 'mark' };
      const sanitized = { username: 'mark' };

      // Act
      const result = diffSanitizedFields(original, sanitized);

      // Assert
      expect(result).toEqual(['password']);
    });

    it('should report removed array elements as changed', () => {
      // Arrange
      const original = { tokens: ['abc', 'def'] };
      const sanitized = { tokens: [] };

      // Act
      const result = diffSanitizedFields(original, sanitized);

      // Assert
      expect(result).toEqual(['tokens[0]', 'tokens[1]']);
    });

    it('should report path when one side is an array and the other is a primitive', () => {
      // Arrange
      const original = { data: ['a', 'b'] };
      const sanitized = { data: '**********' };

      // Act
      const result = diffSanitizedFields(original, sanitized);

      // Assert
      expect(result).toEqual(['data']);
    });

    it('should report path when one side is an object and the other is a primitive', () => {
      // Arrange
      const original = { user: { email: 'a@b.com' } };
      const sanitized = { user: '**********' };

      // Act
      const result = diffSanitizedFields(original, sanitized);

      // Assert
      expect(result).toEqual(['user']);
    });

    it('should report path when one side is null and the other is an object', () => {
      // Arrange
      const original = { meta: { key: 'val' } };
      const sanitized = { meta: null };

      // Act
      const result = diffSanitizedFields(
        original as object,
        sanitized as object,
      );

      // Assert
      expect(result).toEqual(['meta']);
    });

    it('should return multiple changed paths', () => {
      // Arrange
      const original = { email: 'a@b.com', msg: 'hi', password: 'secret' };
      const sanitized = {
        email: '**********',
        msg: 'hi',
        password: '**********',
      };

      // Act
      const result = diffSanitizedFields(original, sanitized);

      // Assert
      expect(result).toEqual(['email', 'password']);
    });

    it('should return empty array when both objects are empty', () => {
      // Act
      const result = diffSanitizedFields({}, {});

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle deeply nested changes', () => {
      // Arrange
      const original = { a: { b: { c: { password: 'secret' } } } };
      const sanitized = { a: { b: { c: { password: '**********' } } } };

      // Act
      const result = diffSanitizedFields(original, sanitized);

      // Assert
      expect(result).toEqual(['a.b.c.password']);
    });

    it('should report path when one side is an array and the other is a plain object', () => {
      // Arrange
      const original = { data: { foo: 1 } };
      const sanitized = { data: [1, 2] };

      // Act
      const result = diffSanitizedFields(original, sanitized);

      // Assert
      expect(result).toEqual(['data']);
    });

    it('should report path when one side is a plain object and the other is an array', () => {
      // Arrange
      const original = { data: [1, 2] };
      const sanitized = { data: { foo: 1 } };

      // Act
      const result = diffSanitizedFields(original, sanitized);

      // Assert
      expect(result).toEqual(['data']);
    });

    it('should use indexed paths when the root value is an array', () => {
      // Arrange
      const original = [{ email: 'a@b.com' }] as unknown as object;
      const sanitized = [{ email: '**********' }] as unknown as object;

      // Act
      const result = diffSanitizedFields(original, sanitized);

      // Assert
      expect(result).toEqual(['[0].email']);
    });

    it('should return an empty array when root values have incompatible types with no common keys', () => {
      // Arrange — the diff is one-directional (walks original's keys); when both
      // roots have no common keys to compare, nothing is reported
      const original = [] as unknown as object;
      const sanitized = {} as object;

      // Act
      const result = diffSanitizedFields(original, sanitized);

      // Assert
      expect(result).toEqual([]);
    });

    it('should not include keys only present in sanitized', () => {
      // Arrange
      const original = { msg: 'hi' };
      const sanitized = { extra: 'added', msg: 'hi' };

      // Act
      const result = diffSanitizedFields(original, sanitized);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('buildSanitizedWarning', () => {
    it('should return null when originalStr is not valid JSON', () => {
      // Act
      const result = buildSanitizedWarning('not json', '{"level":30}');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when sanitizedStr is not valid JSON', () => {
      // Act
      const result = buildSanitizedWarning('{"level":30}', 'not json');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when original parses to a non-object (array)', () => {
      // Act
      const result = buildSanitizedWarning('[]', '{"level":30}');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when original parses to null', () => {
      // Act
      const result = buildSanitizedWarning('null', '{"level":30}');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when sanitized parses to a non-object (array)', () => {
      // Act
      const result = buildSanitizedWarning('{"level":30}', '[]');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when sanitized parses to null', () => {
      // Act
      const result = buildSanitizedWarning('{"level":30}', 'null');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when no fields changed', () => {
      // Arrange
      const str = '{"level":30,"msg":"hi","time":1}';

      // Act
      const result = buildSanitizedWarning(str, str);

      // Assert
      expect(result).toBeNull();
    });

    it('should return a JSON warning string when a field changed', () => {
      // Arrange
      const original =
        '{"level":30,"time":1,"pid":1,"hostname":"x","email":"a@b.com","msg":"hi"}';
      const sanitized =
        '{"level":30,"time":1,"pid":1,"hostname":"x","email":"**********","msg":"hi"}';

      // Act
      const result = buildSanitizedWarning(original, sanitized);

      // Assert
      expect(result).not.toBeNull();
      const parsed = JSON.parse(result as string) as Record<string, unknown>;
      expect(parsed.level).toBe(40);
      expect(parsed.msg).toBe('sensitive data found in log entry');
      expect(parsed.fields).toEqual(['email']);
    });

    it('should exclude the changed field from the warning entry', () => {
      // Arrange
      const original =
        '{"level":30,"time":1,"pid":1,"hostname":"x","email":"a@b.com","msg":"hi"}';
      const sanitized =
        '{"level":30,"time":1,"pid":1,"hostname":"x","email":"**********","msg":"hi"}';

      // Act
      const result = buildSanitizedWarning(original, sanitized);
      const parsed = JSON.parse(result as string) as Record<string, unknown>;

      // Assert
      expect(parsed).not.toHaveProperty('email');
    });

    it('should carry non-changed fields from sanitized into the warning', () => {
      // Arrange
      const original =
        '{"level":30,"time":1,"pid":99,"hostname":"host","email":"a@b.com","msg":"hi"}';
      const sanitized =
        '{"level":30,"time":1,"pid":99,"hostname":"host","email":"**********","msg":"hi"}';

      // Act
      const result = buildSanitizedWarning(original, sanitized);
      const parsed = JSON.parse(result as string) as Record<string, unknown>;

      // Assert
      expect(parsed.time).toBe(1);
      expect(parsed.pid).toBe(99);
      expect(parsed.hostname).toBe('host');
    });

    it('should always override level and msg regardless of their values in the input', () => {
      // Arrange
      const original =
        '{"level":30,"time":1,"email":"a@b.com","msg":"original"}';
      const sanitized =
        '{"level":30,"time":1,"email":"**********","msg":"original"}';

      // Act
      const result = buildSanitizedWarning(original, sanitized);
      const parsed = JSON.parse(result as string) as Record<string, unknown>;

      // Assert
      expect(parsed.level).toBe(40);
      expect(parsed.msg).toBe('sensitive data found in log entry');
    });

    it('should include level and msg in fields when they were themselves sanitized', () => {
      // Arrange — verifies that level/msg appearing in fields[] is intentional:
      // the warning body always overrides them anyway, but reporting they changed
      // is accurate for consumers reading the fields list
      const original = '{"level":30,"time":1,"msg":"password=secret"}';
      const sanitized = '{"level":30,"time":1,"msg":"password=**********"}';

      // Act
      const result = buildSanitizedWarning(original, sanitized);
      const parsed = JSON.parse(result as string) as Record<string, unknown>;

      // Assert
      expect(parsed.fields).toContain('msg');
      expect(parsed.msg).toBe('sensitive data found in log entry');
    });

    it('should omit the parent key when a nested field changed', () => {
      // Arrange
      const original =
        '{"level":30,"time":1,"user":{"email":"a@b.com","id":1},"msg":"hi"}';
      const sanitized =
        '{"level":30,"time":1,"user":{"email":"**********","id":1},"msg":"hi"}';

      // Act
      const result = buildSanitizedWarning(original, sanitized);
      const parsed = JSON.parse(result as string) as Record<string, unknown>;

      // Assert
      expect(parsed).not.toHaveProperty('user');
      expect(parsed.fields).toEqual(['user.email']);
    });

    it('should restrict fields to allowedFields when provided', () => {
      // Arrange
      const original =
        '{"level":30,"time":1,"pid":99,"hostname":"host","reqId":"abc","email":"a@b.com","msg":"hi"}';
      const sanitized =
        '{"level":30,"time":1,"pid":99,"hostname":"host","reqId":"abc","email":"**********","msg":"hi"}';

      // Act
      const result = buildSanitizedWarning(original, sanitized, {
        allowedFields: ['time', 'pid', 'hostname'],
      });
      const parsed = JSON.parse(result as string) as Record<string, unknown>;

      // Assert
      expect(parsed.time).toBe(1);
      expect(parsed.pid).toBe(99);
      expect(parsed.hostname).toBe('host');
      expect(parsed).not.toHaveProperty('reqId');
      expect(parsed).not.toHaveProperty('email');
    });

    it('should include only allowedFields that are not changed', () => {
      // Arrange — allowedFields includes the changed field; changed fields are
      // always excluded regardless of the allowlist
      const original = '{"level":30,"time":1,"email":"a@b.com","msg":"hi"}';
      const sanitized = '{"level":30,"time":1,"email":"**********","msg":"hi"}';

      // Act
      const result = buildSanitizedWarning(original, sanitized, {
        allowedFields: ['time', 'email'],
      });
      const parsed = JSON.parse(result as string) as Record<string, unknown>;

      // Assert
      expect(parsed.time).toBe(1);
      expect(parsed).not.toHaveProperty('email');
    });

    it('should handle multiple changed fields', () => {
      // Arrange
      const original =
        '{"level":30,"time":1,"email":"a@b.com","password":"secret","msg":"hi"}';
      const sanitized =
        '{"level":30,"time":1,"email":"**********","password":"**********","msg":"hi"}';

      // Act
      const result = buildSanitizedWarning(original, sanitized);
      const parsed = JSON.parse(result as string) as Record<string, unknown>;

      // Assert
      expect(parsed.fields).toEqual(['email', 'password']);
      expect(parsed).not.toHaveProperty('email');
      expect(parsed).not.toHaveProperty('password');
    });

    it('should handle a removed field (removeMatches case)', () => {
      // Arrange
      const original = '{"level":30,"time":1,"email":"a@b.com","msg":"hi"}';
      const sanitized = '{"level":30,"time":1,"msg":"hi"}';

      // Act
      const result = buildSanitizedWarning(original, sanitized);
      const parsed = JSON.parse(result as string) as Record<string, unknown>;

      // Assert
      expect(parsed.fields).toEqual(['email']);
      expect(parsed).not.toHaveProperty('email');
    });

    it('should omit the parent key when array element values changed', () => {
      // Arrange
      const original =
        '{"level":30,"time":1,"tokens":["abc","def"],"msg":"hi"}';
      const sanitized =
        '{"level":30,"time":1,"tokens":["**********","**********"],"msg":"hi"}';

      // Act
      const result = buildSanitizedWarning(original, sanitized);
      const parsed = JSON.parse(result as string) as Record<string, unknown>;

      // Assert
      expect(parsed.fields).toEqual(['tokens[0]', 'tokens[1]']);
      expect(parsed).not.toHaveProperty('tokens');
      expect(parsed.time).toBe(1);
    });

    it('should omit the parent key when a field inside an array element changed', () => {
      // Arrange
      const original =
        '{"level":30,"time":1,"users":[{"email":"a@b.com","id":1}],"msg":"hi"}';
      const sanitized =
        '{"level":30,"time":1,"users":[{"email":"**********","id":1}],"msg":"hi"}';

      // Act
      const result = buildSanitizedWarning(original, sanitized);
      const parsed = JSON.parse(result as string) as Record<string, unknown>;

      // Assert
      expect(parsed.fields).toEqual(['users[0].email']);
      expect(parsed).not.toHaveProperty('users');
      expect(parsed.time).toBe(1);
    });
  });
});
