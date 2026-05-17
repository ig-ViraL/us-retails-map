/**
 * Module containing application-specific error classes to enable consistent
 * error handling throughout the backend. Provides base AppError and derived
 * ValidationError for specialized HTTP error handling.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Additional custom error classes can be added to this module as needed.
 * To define a new error type, extend the AppError base class and specify
 * an appropriate HTTP status code and error message.
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
    this.name = 'ValidationError';
  }
}
