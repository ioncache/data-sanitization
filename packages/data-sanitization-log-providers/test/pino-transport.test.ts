/* npm imports */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* local imports */
import pinoTransport from '../src/pino-transport';

const clean = '{"level":30,"time":1,"pid":1,"hostname":"h","msg":"hello"}';
const dirty =
  '{"level":30,"time":1,"pid":1,"hostname":"h","password":"secret","msg":"hi"}';

async function runTransport(
  lines: string[],
  opts: Parameters<typeof pinoTransport>[0] = {},
): Promise<string[]> {
  const written: string[] = [];
  const writeSpy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk) => {
      written.push(typeof chunk === 'string' ? chunk : String(chunk));
      return true;
    });

  try {
    await pinoTransport(opts);

    // Access the source handler via the build mock
    const buildMock = (await import('pino-abstract-transport'))
      .default as ReturnType<typeof vi.fn>;
    const [sourceHandler] = buildMock.mock.lastCall as [
      (source: AsyncIterable<string>) => Promise<void>,
    ];

    async function* makeSource(): AsyncGenerator<string> {
      for (const line of lines) {
        yield line;
      }
    }

    await sourceHandler(makeSource());
  } finally {
    writeSpy.mockRestore();
  }

  return written;
}

vi.mock('pino-abstract-transport', () => ({
  default: vi.fn((fn: unknown, _opts: unknown) => fn),
}));

describe('pino-transport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('pinoTransport', () => {
    it('should write the original line unchanged when no sensitive fields are present', async () => {
      // Act
      const written = await runTransport([clean]);

      // Assert
      expect(written).toEqual([clean + '\n']);
    });

    it('should sanitize a sensitive field', async () => {
      // Act
      const written = await runTransport([dirty]);

      // Assert
      const sanitizedLine = written.find((w) => w.includes('"msg":"hi"'));
      expect(sanitizedLine).toBeDefined();
      expect(sanitizedLine).not.toContain('"secret"');
      expect(sanitizedLine).toContain('**********');
    });

    it('should write a warning line before the sanitized line', async () => {
      // Act
      const written = await runTransport([dirty]);

      // Assert
      expect(written).toHaveLength(2);
      const warning = JSON.parse(written[0].trim()) as Record<string, unknown>;
      expect(warning.level).toBe(40);
      expect(warning.fields).toEqual(['password']);
    });

    it('should include default allowedFields (time, pid, hostname) in the warning', async () => {
      // Act
      const written = await runTransport([dirty]);
      const warning = JSON.parse(written[0].trim()) as Record<string, unknown>;

      // Assert
      expect(warning.time).toBe(1);
      expect(warning.pid).toBe(1);
      expect(warning.hostname).toBe('h');
    });

    it('should use custom allowedFields when provided', async () => {
      // Act
      const written = await runTransport([dirty], { allowedFields: ['time'] });
      const warning = JSON.parse(written[0].trim()) as Record<string, unknown>;

      // Assert
      expect(warning.time).toBe(1);
      expect(warning).not.toHaveProperty('pid');
    });

    it('should handle multiple lines in sequence', async () => {
      // Act
      const written = await runTransport([clean, dirty, clean]);

      // Assert — clean+clean write 1 line each, dirty writes 2
      expect(written).toHaveLength(4);
    });

    it('should write an error placeholder when sanitization throws', async () => {
      // Arrange — customPatterns is fine but we need a matcher that throws
      // Use a custom matcher that throws to force the error path
      const written: string[] = [];
      const writeSpy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation((chunk) => {
          written.push(typeof chunk === 'string' ? chunk : String(chunk));
          return true;
        });

      await pinoTransport();

      const buildMock = (await import('pino-abstract-transport'))
        .default as ReturnType<typeof vi.fn>;
      const [sourceHandler] = buildMock.mock.lastCall as [
        (source: AsyncIterable<string>) => Promise<void>,
      ];

      // Override sanitizeLine to throw by passing an invalid customMatchers
      // (functions are not supported in PinoTransportOptions, so we simulate
      // the error path by using vi.mock on the shared module)
      const shared = await import('../src/shared');
      const throwingSanitize = vi
        .spyOn(shared, 'sanitizeLine')
        .mockImplementationOnce(() => {
          throw new Error('sanitization failed');
        });

      async function* makeSource(): AsyncGenerator<string> {
        yield dirty;
      }

      await sourceHandler(makeSource());
      writeSpy.mockRestore();
      throwingSanitize.mockRestore();

      // Assert
      expect(written).toHaveLength(1);
      const parsed = JSON.parse(written[0].trim()) as Record<string, unknown>;
      expect(parsed.level).toBe(50);
      expect(parsed.msg).toBe('log entry dropped: sanitization failed');
    });

    it('should handle backpressure when write returns false and drain is emitted', async () => {
      // Arrange
      const written: string[] = [];
      let firstCall = true;
      const writeSpy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation((chunk) => {
          written.push(typeof chunk === 'string' ? chunk : String(chunk));
          if (firstCall) {
            firstCall = false;
            setImmediate(() => process.stdout.emit('drain'));
            return false;
          }
          return true;
        });

      try {
        await pinoTransport();

        const buildMock = (await import('pino-abstract-transport'))
          .default as ReturnType<typeof vi.fn>;
        const [sourceHandler] = buildMock.mock.lastCall as [
          (source: AsyncIterable<string>) => Promise<void>,
        ];

        async function* makeSource(): AsyncGenerator<string> {
          yield clean;
        }

        await sourceHandler(makeSource());
      } finally {
        writeSpy.mockRestore();
      }

      // Assert — line was written despite backpressure
      expect(written).toEqual([clean + '\n']);
    });

    it('should pass build the parse:lines option', async () => {
      // Act
      await pinoTransport();

      // Assert
      const buildMock = (await import('pino-abstract-transport'))
        .default as ReturnType<typeof vi.fn>;
      const [, buildOpts] = buildMock.mock.lastCall as [
        unknown,
        { parse: string },
      ];
      expect(buildOpts).toEqual({ parse: 'lines' });
    });
  });
});
