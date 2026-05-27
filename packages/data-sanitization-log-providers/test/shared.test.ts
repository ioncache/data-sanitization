/* npm imports */
import { describe, expect, it } from 'vitest';

/* local imports */
import { buildErrorPlaceholder, sanitizeLine } from '../src/shared';

describe('shared', () => {
  describe('sanitizeLine', () => {
    it('should leave the line unchanged and produce no warning when there are no sensitive fields', () => {
      // Arrange
      const line = '{"level":30,"time":1,"msg":"hello"}';

      // Act
      const result = sanitizeLine(line, {}, ['time']);

      // Assert
      expect(result.sanitized).toBe(line);
      expect(result.warning).toBeNull();
    });

    it('should leave the line unchanged when a custom pattern is configured but nothing matches', () => {
      // Arrange
      const line = '{"level":30,"msg":"no secrets here"}';

      // Act
      const result = sanitizeLine(line, { customPatterns: ['email'] }, []);

      // Assert
      expect(result.sanitized).toBe(line);
      expect(result.warning).toBeNull();
    });

    it('should mask the sensitive field value in the output', () => {
      // Arrange
      const line = '{"level":30,"password":"secret","msg":"login"}';

      // Act
      const result = sanitizeLine(line, {}, []);

      // Assert
      expect(result.sanitized).not.toContain('"secret"');
      expect(result.sanitized).toContain('**********');
    });

    it('should emit a warning when a sensitive field is masked', () => {
      // Arrange
      const line = '{"level":30,"time":1,"password":"secret","msg":"login"}';

      // Act
      const result = sanitizeLine(line, {}, ['time']);

      // Assert
      expect(result.warning).not.toBeNull();
      const parsed = JSON.parse(result.warning as string) as Record<
        string,
        unknown
      >;
      expect(parsed.fields).toEqual(['password']);
    });

    it('should include allowedFields in the warning', () => {
      // Arrange
      const line =
        '{"level":30,"time":1716667200000,"pid":99,"password":"secret","msg":"hi"}';

      // Act
      const result = sanitizeLine(line, {}, ['time', 'pid']);

      // Assert
      const parsed = JSON.parse(result.warning as string) as Record<
        string,
        unknown
      >;
      expect(parsed.time).toBe(1716667200000);
      expect(parsed.pid).toBe(99);
    });

    it('should emit a warning identifying the masked field when no extra fields are allowed in the warning', () => {
      // Arrange
      const line = '{"level":30,"password":"secret","msg":"login"}';

      // Act
      const result = sanitizeLine(line, {}, []);

      // Assert
      expect(result.warning).not.toBeNull();
      const parsed = JSON.parse(result.warning as string) as Record<
        string,
        unknown
      >;
      expect(parsed.fields).toEqual(['password']);
      expect(parsed.level).toBe(40);
    });
  });

  describe('buildErrorPlaceholder', () => {
    it('should produce an error-level log entry when the original line is valid JSON', () => {
      // Arrange
      const original =
        '{"level":30,"time":1716667200000,"pid":99,"hostname":"api-1","msg":"hi"}';

      // Act
      const result = buildErrorPlaceholder(original);
      const parsed = JSON.parse(result) as Record<string, unknown>;

      // Assert
      expect(parsed.level).toBe(50);
      expect(parsed.msg).toBe('log entry dropped: sanitization failed');
    });

    it('should preserve time, pid, and hostname from original', () => {
      // Arrange
      const original =
        '{"level":30,"time":123,"pid":42,"hostname":"host","msg":"hi"}';

      // Act
      const parsed = JSON.parse(buildErrorPlaceholder(original)) as Record<
        string,
        unknown
      >;

      // Assert
      expect(parsed.time).toBe(123);
      expect(parsed.pid).toBe(42);
      expect(parsed.hostname).toBe('host');
    });

    it('should omit missing optional fields', () => {
      // Arrange
      const original = '{"level":30,"msg":"hi"}';

      // Act
      const parsed = JSON.parse(buildErrorPlaceholder(original)) as Record<
        string,
        unknown
      >;

      // Assert
      expect(parsed).not.toHaveProperty('time');
      expect(parsed).not.toHaveProperty('pid');
      expect(parsed).not.toHaveProperty('hostname');
    });

    it('should not include sensitive fields from original', () => {
      // Arrange
      const original = '{"level":30,"password":"secret","msg":"hi"}';

      // Act
      const result = buildErrorPlaceholder(original);

      // Assert
      expect(result).not.toContain('secret');
      expect(result).not.toContain('password');
    });
  });
});
