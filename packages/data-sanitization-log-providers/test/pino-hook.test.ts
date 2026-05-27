/* npm imports */
import { describe, expect, it, vi } from 'vitest';

/* local imports */
import { createSanitizeLogLine } from '../src/pino-hook';

const clean = '{"level":30,"time":1,"pid":1,"hostname":"h","msg":"hello"}\n';
const dirty =
  '{"level":30,"time":1,"pid":1,"hostname":"h","password":"secret","msg":"hi"}\n';

describe('pino-hook', () => {
  describe('createSanitizeLogLine', () => {
    it('should return the original line unchanged when no sensitive fields are present', () => {
      // Arrange
      const hook = createSanitizeLogLine();

      // Act
      const result = hook(clean);

      // Assert
      expect(result).toBe(clean);
    });

    it('should not append a trailing newline when the sanitized output already ends with one', () => {
      // Arrange
      // parseJsonStrings: false forces the regex path, which preserves the
      // trailing \n in the output; the hook must not double-append it.
      const hook = createSanitizeLogLine({ parseJsonStrings: false });

      // Act
      const result = hook(clean);

      // Assert
      expect(result).toBe(clean);
    });

    it('should sanitize a sensitive field and return a masked line', () => {
      // Arrange
      const hook = createSanitizeLogLine();

      // Act
      const result = hook(dirty);

      // Assert
      expect(result).not.toContain('"secret"');
      expect(result).toContain('**********');
    });

    it('should include a warning entry before the sanitized log line when a field is masked', () => {
      // Arrange
      const hook = createSanitizeLogLine();

      // Act
      const result = hook(dirty);
      const lines = result.split('\n').filter(Boolean);

      // Assert
      expect(lines).toHaveLength(2);
      const warning = JSON.parse(lines[0]) as Record<string, unknown>;
      expect(warning.level).toBe(40);
      expect(warning.msg).toBe('sensitive data found in log entry');
      expect(warning.fields).toEqual(['password']);
    });

    it('should include default allowedFields (time, pid, hostname) in the warning', () => {
      // Arrange
      const hook = createSanitizeLogLine();

      // Act
      const result = hook(dirty);
      const warning = JSON.parse(result.split('\n')[0]) as Record<
        string,
        unknown
      >;

      // Assert
      expect(warning.time).toBe(1);
      expect(warning.pid).toBe(1);
      expect(warning.hostname).toBe('h');
    });

    it('should use custom allowedFields when provided', () => {
      // Arrange
      const hook = createSanitizeLogLine({ allowedFields: ['time'] });

      // Act
      const result = hook(dirty);
      const warning = JSON.parse(result.split('\n')[0]) as Record<
        string,
        unknown
      >;

      // Assert
      expect(warning.time).toBe(1);
      expect(warning).not.toHaveProperty('pid');
      expect(warning).not.toHaveProperty('hostname');
    });

    it('should emit a warning identifying only the changed fields when no extra fields are allowed in the warning', () => {
      // Arrange
      const hook = createSanitizeLogLine({ allowedFields: [] });

      // Act
      const result = hook(dirty);
      const lines = result.split('\n').filter(Boolean);

      // Assert
      expect(lines).toHaveLength(2);
      const warning = JSON.parse(lines[0]) as Record<string, unknown>;
      expect(warning.fields).toEqual(['password']);
    });

    it('should accept custom sanitization options', () => {
      // Arrange
      const line =
        '{"level":30,"time":1,"email":"mark@example.com","msg":"hi"}\n';
      const hook = createSanitizeLogLine({ customPatterns: ['email'] });

      // Act
      const result = hook(line);

      // Assert
      expect(result).not.toContain('mark@example.com');
    });

    it('should call onError and return its result when sanitization throws', () => {
      // Arrange
      const onError = vi.fn(
        (_err: unknown, original: string) => 'ERROR:' + original,
      );
      const hook = createSanitizeLogLine({
        customMatchers: [
          () => {
            throw new Error('matcher failed');
          },
        ],
        onError,
      });

      // Act
      const result = hook(dirty);

      // Assert
      expect(onError).toHaveBeenCalledOnce();
      expect(result).toContain('ERROR:');
    });

    it('should emit an error-level placeholder when sanitization throws and no onError is set', () => {
      // Arrange
      const hook = createSanitizeLogLine({
        customMatchers: [
          () => {
            throw new Error('matcher failed');
          },
        ],
      });

      // Act
      const result = hook(dirty);
      const parsed = JSON.parse(result.trim()) as Record<string, unknown>;

      // Assert
      expect(parsed.level).toBe(50);
      expect(parsed.msg).toBe('log entry dropped: sanitization failed');
      expect(parsed.time).toBe(1);
      expect(parsed.pid).toBe(1);
      expect(parsed.hostname).toBe('h');
    });

    it('should not include sensitive fields in the error placeholder', () => {
      // Arrange
      const hook = createSanitizeLogLine({
        customMatchers: [
          () => {
            throw new Error('matcher failed');
          },
        ],
      });

      // Act
      const result = hook(dirty);

      // Assert
      expect(result).not.toContain('secret');
      expect(result).not.toContain('password');
    });
  });
});
