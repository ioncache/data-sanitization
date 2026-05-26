import {
  sanitizeData,
  type DataSanitizationReplacerOptions,
} from 'data-sanitization';
import { buildSanitizedWarning } from 'data-sanitization/utils';

const ERROR_LEVEL = 50;
const ERROR_MSG = 'log entry dropped: sanitization failed';
const PINO_DEFAULT_ALLOWED_FIELDS = Object.freeze([
  'time',
  'pid',
  'hostname',
] as const);

interface SanitizeLineResult {
  sanitized: string;
  warning: string | null;
}

/**
 * Sanitizes a JSON log line and returns the sanitized string plus an optional
 * warning line.
 *
 * @param line - Raw log line to sanitize (with or without trailing newline).
 * @param sanitizeOptions - Options forwarded to `sanitizeData`.
 * @param allowedFields - Fields to carry into the warning entry.
 * @returns Object with `sanitized` and `warning` (`null` when no fields changed).
 *
 * @example
 * sanitizeLine('{"password":"secret","user":"alice"}\n', {}, ['user'])
 * // => { sanitized: '{"password":"**********","user":"alice"}\n', warning: '...' }
 */
function sanitizeLine(
  line: string,
  sanitizeOptions: DataSanitizationReplacerOptions,
  allowedFields: readonly string[],
): SanitizeLineResult {
  const sanitized = sanitizeData(line, sanitizeOptions) as string;
  const warning =
    sanitized !== line
      ? buildSanitizedWarning(line, sanitized, { allowedFields })
      : null;
  return { sanitized, warning };
}

/**
 * Builds a JSON error-level placeholder from a raw log line, preserving
 * `time`, `pid`, and `hostname` for traceability without re-emitting
 * potentially unsanitized content.
 *
 * @param original - Original log line before sanitization.
 * @returns A JSON string at level 50 indicating sanitization failure.
 *
 * @example
 * buildErrorPlaceholder('{"time":1700000000,"pid":123,"password":"secret"}')
 * // => '{"level":50,"time":1700000000,"pid":123,"msg":"log entry dropped: sanitization failed"}'
 */
function buildErrorPlaceholder(original: string): string {
  try {
    const parsed = JSON.parse(original) as Record<string, unknown>;
    const { time, pid, hostname } = parsed;
    return JSON.stringify({
      level: ERROR_LEVEL,
      ...(time !== undefined && { time }),
      ...(pid !== undefined && { pid }),
      ...(hostname !== undefined && { hostname }),
      msg: ERROR_MSG,
    });
  } catch {
    /* istanbul ignore next -- only reached when original is not valid JSON */
    return JSON.stringify({ level: ERROR_LEVEL, msg: ERROR_MSG });
  }
}

export { sanitizeLine, buildErrorPlaceholder, PINO_DEFAULT_ALLOWED_FIELDS };
export type { SanitizeLineResult };
