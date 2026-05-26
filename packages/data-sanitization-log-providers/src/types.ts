import type { DataSanitizationReplacerOptions } from 'data-sanitization';

/**
 * Options for {@link createSanitizeLogLine}.
 */
interface PinoHookOptions extends DataSanitizationReplacerOptions {
  /**
   * Fields from the sanitized log object to carry into the warning entry.
   *
   * Default: `['time', 'pid', 'hostname']`.
   */
  allowedFields?: string[];
  /**
   * Called when `sanitizeData` throws. Must return a string to write in place
   * of the original log line. Default: emits an error-level (50) JSON
   * placeholder preserving `time`, `pid`, and `hostname` from the original.
   */
  onError?: (err: unknown, original: string) => string;
}

/**
 * Options for the pino transport default export.
 *
 * Extends {@link DataSanitizationReplacerOptions} except for `customMatchers`,
 * which cannot be serialized across the worker-thread boundary. Use the
 * `/pino-hook` adapter when custom matcher functions are required.
 */
type PinoTransportOptions = Omit<
  DataSanitizationReplacerOptions,
  'customMatchers'
> & {
  /**
   * Fields from the sanitized log object to carry into the warning entry.
   *
   * Default: `['time', 'pid', 'hostname']`.
   */
  allowedFields?: string[];
};

/**
 * Options for {@link createSanitizingTransport}.
 */
interface WinstonSanitizationOptions {
  /** Standard winston transport options (level, silent, handleExceptions). */
  level?: string;
  silent?: boolean;
  handleExceptions?: boolean;
  handleRejections?: boolean;
  /**
   * Sanitization options forwarded to `sanitizeData`.
   */
  sanitize?: DataSanitizationReplacerOptions;
  /**
   * Fields from the sanitized log object to carry into the warning entry.
   *
   * Default: `[]` — no fields carry through unless explicitly listed. Winston
   * has no standardized correlation-field convention, so callers opt in
   * explicitly (e.g. `['timestamp', 'service']`).
   */
  allowedFields?: string[];
  /**
   * When `true`, a structured warning line is written to the output stream
   * immediately before the sanitized line as a separate `stream.write()` call.
   *
   * Winston formats are 1-to-1 (one `info` object → one serialized `MESSAGE`
   * string), so there is no built-in way to emit a second log line from a
   * format transform. This transport subclass owns the write path, which makes
   * the two-line pattern possible. Enable only when writing to a file or
   * stream — structured aggregators that expect exactly one JSON object per
   * write call may not handle the extra line correctly.
   *
   * Default: `false`.
   */
  emitWarning?: boolean;
  /**
   * Output stream. Default: `process.stdout`.
   */
  stream?: NodeJS.WritableStream;
  /**
   * Called when `sanitizeData` throws. Default: emits an error-level
   * placeholder to the output stream and continues processing.
   */
  onError?: (err: unknown) => void;
}

export type {
  PinoHookOptions,
  PinoTransportOptions,
  WinstonSanitizationOptions,
};
