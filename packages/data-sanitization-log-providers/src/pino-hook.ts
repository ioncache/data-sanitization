import {
  buildErrorPlaceholder,
  PINO_DEFAULT_ALLOWED_FIELDS,
  sanitizeLine,
} from './shared.js';
import type { PinoHookOptions } from './types.js';

/**
 * Creates a sanitizing function for pino's `hooks.streamWrite` option.
 *
 * The returned function sanitizes each log line synchronously in the main
 * thread. When sensitive fields are found, a structured warning entry is
 * prepended so the sanitization event is visible in log aggregators. On
 * error, the default handler emits an error-level (50) JSON placeholder
 * preserving `time`, `pid`, and `hostname` for traceability.
 *
 * @param options - Sanitization and hook options.
 * @returns A `(s: string) => string` function for `pino({ hooks: { streamWrite: fn } })`.
 *
 * @example
 * import pino from 'pino';
 * import { createSanitizeLogLine } from 'data-sanitization-log-providers/pino-hook';
 *
 * const logger = pino({
 *   hooks: { streamWrite: createSanitizeLogLine({ customPatterns: ['email'] }) },
 * });
 */
function createSanitizeLogLine(
  options: PinoHookOptions = {},
): (s: string) => string {
  const {
    onError,
    allowedFields = PINO_DEFAULT_ALLOWED_FIELDS,
    ...sanitizeOptions
  } = options;

  return function sanitizeLogLine(s: string): string {
    let result: ReturnType<typeof sanitizeLine>;
    try {
      result = sanitizeLine(s, sanitizeOptions, allowedFields);
    } catch (err) {
      if (onError) {
        return onError(err, s);
      }
      return buildErrorPlaceholder(s) + '\n';
    }

    const { sanitized, warning } = result;
    if (warning) {
      return warning + '\n' + sanitized;
    }
    return sanitized;
  };
}

export { createSanitizeLogLine };
