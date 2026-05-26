import TransportStream from 'winston-transport';
import { sanitizeLine, buildErrorPlaceholder } from './shared.js';
import type { DataSanitizationReplacerOptions } from 'data-sanitization';
import type { WinstonSanitizationOptions } from './types.js';

const MESSAGE = Symbol.for('message');

/**
 * A winston `TransportStream` that sanitizes log entries before writing them.
 *
 * Reads `info[Symbol.for('message')]` (the final serialized string produced by
 * upstream formats such as `format.json()`), sanitizes it, and writes the
 * result to the configured output stream. When `emitWarning` is enabled, a
 * structured warning line is written first as a separate `stream.write()` call.
 *
 * Add this transport after a serializing format in the format chain so that
 * `info[MESSAGE]` is already a JSON string when `log()` is called.
 */
class SanitizingTransport extends TransportStream {
  readonly #sanitizeOptions: DataSanitizationReplacerOptions;
  readonly #allowedFields: readonly string[];
  readonly #emitWarning: boolean;
  readonly #dest: NodeJS.WritableStream;
  readonly #onError: (err: unknown) => void;

  constructor(opts: WinstonSanitizationOptions = {}) {
    const {
      sanitize = {},
      allowedFields = [],
      emitWarning = false,
      stream: dest = process.stdout,
      onError,
      ...rest
    } = opts;
    super(rest as ConstructorParameters<typeof TransportStream>[0]);
    this.#sanitizeOptions = sanitize;
    this.#allowedFields = allowedFields;
    this.#emitWarning = emitWarning;
    this.#dest = dest;
    this.#onError = onError ?? (() => undefined);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override log(info: any, callback: () => void): void {
    const raw = (info as Record<symbol, unknown>)[MESSAGE] as
      | string
      | undefined;

    let sanitized: string;
    let warning: string | null = null;

    try {
      const input = typeof raw === 'string' ? raw : JSON.stringify(info);
      ({ sanitized, warning } = sanitizeLine(
        input,
        this.#sanitizeOptions,
        this.#allowedFields,
      ));
    } catch (err) {
      this.#onError(err);
      this.#dest.write(buildErrorPlaceholder(raw ?? '') + '\n');
      this.emit('logged', info);
      callback();
      return;
    }

    if (this.#emitWarning && warning) {
      this.#dest.write(warning + '\n');
    }
    this.#dest.write(sanitized + '\n');
    this.emit('logged', info);
    callback();
  }
}

/**
 * Creates a sanitizing winston transport.
 *
 * Sanitizes each log entry's serialized `MESSAGE` string before writing it to
 * the output stream. Compose with `winston.format.json()` (or equivalent) so
 * that the `MESSAGE` symbol is populated before sanitization runs.
 *
 * @param options - Transport and sanitization options.
 * @returns A configured {@link SanitizingTransport} instance.
 *
 * @example
 * import winston from 'winston';
 * import { createSanitizingTransport } from 'data-sanitization-log-providers/winston';
 *
 * const logger = winston.createLogger({
 *   format: winston.format.json(),
 *   transports: [
 *     createSanitizingTransport({
 *       sanitize: { customPatterns: ['email'] },
 *       allowedFields: ['timestamp', 'service'],
 *       emitWarning: true,
 *     }),
 *   ],
 * });
 */
function createSanitizingTransport(
  options: WinstonSanitizationOptions = {},
): SanitizingTransport {
  return new SanitizingTransport(options);
}

export { createSanitizingTransport, SanitizingTransport };
