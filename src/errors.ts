/**
 * Error thrown when data cannot be sanitized safely.
 * Stores optional diagnostic details for callers that need structured context.
 *
 * @example
 * const error = new DataSanitizationError('Invalid data type', {
 *   originalData: 123,
 * });
 * error.name;
 * // => 'DataSanitizationError'
 */
class DataSanitizationError extends Error {
  /**
   * Creates a data sanitization error with optional diagnostic details.
   *
   * @param message - Human-readable error message.
   * @param details - Structured context describing the failure.
   * @returns A data sanitization error instance.
   * @throws Does not throw.
   *
   * @example
   * const error = new DataSanitizationError('Invalid data type', {
   *   originalData: 123,
   * });
   */
  constructor(message: string, details: unknown = {}) {
    super(message);
    this.name = 'DataSanitizationError';
    this.details = details;
  }

  details: unknown = {};
}

export { DataSanitizationError };
