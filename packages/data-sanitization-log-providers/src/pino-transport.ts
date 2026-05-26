import { once } from 'node:events';
import build from 'pino-abstract-transport';

const writeLine = async (line: string): Promise<void> => {
  if (!process.stdout.write(line + '\n')) {
    await once(process.stdout, 'drain');
  }
};
import {
  buildErrorPlaceholder,
  PINO_DEFAULT_ALLOWED_FIELDS,
  sanitizeLine,
} from './shared.js';
import type { PinoTransportOptions } from './types.js';

/**
 * Pino `pino-abstract-transport` worker module.
 *
 * Use as the `target` for `pino.transport()`. Sanitizes each log line and
 * writes the result to `process.stdout`. When sensitive fields are found, a
 * structured warning entry is written first so the sanitization event is
 * visible in log aggregators. On error, an error-level (50) JSON placeholder
 * is written in place of the original line.
 *
 * Note: `customMatchers` is not supported because functions cannot be
 * serialized across the worker-thread boundary. Use the `/pino-hook` adapter
 * when custom matcher functions are required.
 *
 * @param opts - Serializable sanitization options passed via `pino.transport({ options: ... })`.
 *
 * @example
 * import pino from 'pino';
 *
 * const logger = pino({
 *   transport: {
 *     target: 'data-sanitization-log-providers/pino-transport',
 *     options: { customPatterns: ['email'] },
 *   },
 * });
 */
export default async function pinoTransport(
  opts: PinoTransportOptions = {},
): Promise<unknown> {
  const { allowedFields = PINO_DEFAULT_ALLOWED_FIELDS, ...sanitizeOptions } =
    opts;

  return build(
    async function (source: AsyncIterable<string>): Promise<void> {
      for await (const line of source) {
        try {
          const { sanitized, warning } = sanitizeLine(
            line,
            sanitizeOptions,
            allowedFields,
          );
          if (warning) {
            await writeLine(warning);
          }
          await writeLine(sanitized);
        } catch {
          await writeLine(buildErrorPlaceholder(line));
        }
      }
    },
    { parse: 'lines' },
  );
}
