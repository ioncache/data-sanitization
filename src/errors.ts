class DataSanitizationError extends Error {
  constructor(message: string, details: unknown = {}) {
    super(message);
    this.name = 'DataSanitizationError';
    this.details = details;
  }

  details: unknown = {};
}

export { DataSanitizationError };
