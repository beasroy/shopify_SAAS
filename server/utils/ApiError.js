export class ApiError extends Error {
  constructor(status, message, options = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = options.code || "INTERNAL_ERROR";
    this.provider = options.provider || null;
    this.reconnectRequired = options.reconnectRequired || false;
    this.publicError = options.publicError || "Request failed.";
    this.details = options.details;
    this.retryable = options.retryable ?? status >= 500;
  }
}
