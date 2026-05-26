/* npm imports */
import { Writable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

/* local imports */
import { SanitizingTransport, createSanitizingTransport } from '../src/winston';

const MESSAGE = Symbol.for('message');

function makeStream(): { stream: Writable; lines: () => string[] } {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer | string, _enc: string, cb: () => void) {
      chunks.push(typeof chunk === 'string' ? chunk : chunk.toString());
      cb();
    },
  });
  return { lines: () => chunks, stream };
}

function makeInfo(msg: string, raw: string): Record<string | symbol, unknown> {
  return { level: 'info', message: msg, [MESSAGE]: raw };
}

describe('winston', () => {
  describe('createSanitizingTransport', () => {
    it('should return a SanitizingTransport instance', () => {
      expect(createSanitizingTransport()).toBeInstanceOf(SanitizingTransport);
    });
  });

  describe('SanitizingTransport', () => {
    it('should write the original line unchanged when no sensitive fields are present', () => {
      // Arrange
      const { stream, lines } = makeStream();
      const transport = new SanitizingTransport({ stream });
      const raw = '{"level":"info","msg":"hello"}';
      const info = makeInfo('hello', raw);

      // Act
      transport.log(info, () => undefined);

      // Assert
      expect(lines()).toEqual([raw + '\n']);
    });

    it('should sanitize a sensitive field', () => {
      // Arrange
      const { stream, lines } = makeStream();
      const transport = new SanitizingTransport({ stream });
      const raw = '{"level":"info","password":"secret","msg":"login"}';
      const info = makeInfo('login', raw);

      // Act
      transport.log(info, () => undefined);

      // Assert
      expect(lines()[0]).not.toContain('"secret"');
      expect(lines()[0]).toContain('**********');
    });

    it('should not emit a warning line when emitWarning is false (default)', () => {
      // Arrange
      const { stream, lines } = makeStream();
      const transport = new SanitizingTransport({ stream });
      const raw = '{"level":"info","password":"secret","msg":"login"}';
      const info = makeInfo('login', raw);

      // Act
      transport.log(info, () => undefined);

      // Assert
      expect(lines()).toHaveLength(1);
    });

    it('should emit a warning line before the sanitized line when emitWarning is true', () => {
      // Arrange
      const { stream, lines } = makeStream();
      const transport = new SanitizingTransport({
        allowedFields: ['timestamp'],
        emitWarning: true,
        stream,
      });
      const raw =
        '{"level":"info","timestamp":"2024-01-01","password":"secret","msg":"hi"}';
      const info = makeInfo('hi', raw);

      // Act
      transport.log(info, () => undefined);

      // Assert
      expect(lines()).toHaveLength(2);
      const warning = JSON.parse(lines()[0]) as Record<string, unknown>;
      expect(warning.level).toBe(40);
      expect(warning.msg).toBe('sensitive data found in log entry');
      expect(warning.fields).toEqual(['password']);
      expect(warning.timestamp).toBe('2024-01-01');
    });

    it('should not emit a warning line when emitWarning is true but no fields changed', () => {
      // Arrange
      const { stream, lines } = makeStream();
      const transport = new SanitizingTransport({ emitWarning: true, stream });
      const raw = '{"level":"info","msg":"clean"}';
      const info = makeInfo('clean', raw);

      // Act
      transport.log(info, () => undefined);

      // Assert
      expect(lines()).toHaveLength(1);
    });

    it('should use default empty allowedFields so no extra fields appear in warning', () => {
      // Arrange
      const { stream, lines } = makeStream();
      const transport = new SanitizingTransport({ emitWarning: true, stream });
      const raw =
        '{"level":"info","service":"api","timestamp":"t","password":"secret","msg":"hi"}';
      const info = makeInfo('hi', raw);

      // Act
      transport.log(info, () => undefined);

      // Assert
      const warning = JSON.parse(lines()[0]) as Record<string, unknown>;
      expect(warning).not.toHaveProperty('service');
      expect(warning).not.toHaveProperty('timestamp');
    });

    it('should write JSON.stringify of info when MESSAGE is not a string', () => {
      // Arrange
      const { stream, lines } = makeStream();
      const transport = new SanitizingTransport({ stream });
      const info = { level: 'info', message: 'hi' }; // no MESSAGE symbol

      // Act
      transport.log(info, () => undefined);

      // Assert
      expect(lines()[0]).toContain('"message":"hi"');
    });

    it('should call onError and write placeholder when sanitization throws', () => {
      // Arrange
      const { stream, lines } = makeStream();
      const onError = vi.fn();
      const transport = new SanitizingTransport({
        onError,
        sanitize: {
          customMatchers: [
            () => {
              throw new Error('boom');
            },
          ],
        },
        stream,
      });
      const raw = '{"level":"info","password":"secret","msg":"hi"}';
      const info = makeInfo('hi', raw);

      // Act
      transport.log(info, () => undefined);

      // Assert
      expect(onError).toHaveBeenCalledOnce();
      const parsed = JSON.parse(lines()[0]) as Record<string, unknown>;
      expect(parsed.level).toBe(50);
    });

    it('should emit logged event and call callback', () => {
      // Arrange
      const { stream } = makeStream();
      const transport = new SanitizingTransport({ stream });
      const callback = vi.fn();
      const loggedListener = vi.fn();
      transport.on('logged', loggedListener);
      const raw = '{"level":"info","msg":"hi"}';
      const info = makeInfo('hi', raw);

      // Act
      transport.log(info, callback);

      // Assert
      expect(callback).toHaveBeenCalledOnce();
      expect(loggedListener).toHaveBeenCalledOnce();
    });

    it('should accept custom sanitize options', () => {
      // Arrange
      const { stream, lines } = makeStream();
      const transport = new SanitizingTransport({
        sanitize: { customPatterns: ['email'] },
        stream,
      });
      const raw = '{"level":"info","email":"mark@example.com","msg":"hi"}';
      const info = makeInfo('hi', raw);

      // Act
      transport.log(info, () => undefined);

      // Assert
      expect(lines()[0]).not.toContain('mark@example.com');
    });

    it('should silently continue when sanitization throws and no onError is provided', () => {
      // Arrange
      const { stream, lines } = makeStream();
      const transport = new SanitizingTransport({
        sanitize: {
          customMatchers: [
            () => {
              throw new Error('boom');
            },
          ],
        },
        stream,
      });
      const raw = '{"level":"info","password":"secret","msg":"hi"}';
      const info = makeInfo('hi', raw);

      // Act
      transport.log(info, () => undefined);

      // Assert
      const parsed = JSON.parse(lines()[0]) as Record<string, unknown>;
      expect(parsed.level).toBe(50);
    });

    it('should write to process.stdout by default', () => {
      // Arrange
      const transport = new SanitizingTransport();
      const written: string[] = [];
      const spy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation((chunk) => {
          written.push(typeof chunk === 'string' ? chunk : String(chunk));
          return true;
        });
      const raw = '{"level":"info","msg":"hi"}';
      const info = makeInfo('hi', raw);

      // Act
      transport.log(info, () => undefined);
      spy.mockRestore();

      // Assert
      expect(written).toHaveLength(1);
      expect(written[0]).toContain('"msg":"hi"');
    });
  });
});
