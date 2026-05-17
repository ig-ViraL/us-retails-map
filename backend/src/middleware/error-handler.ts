import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';

/**
 * Express global error handler middleware.
 * Handles known AppError errors with a custom status code and message,
 * and sends a 500 Internal Server Error for all other uncaught exceptions.
 * Logs unexpected errors to the server console for diagnosis.
 *
 * @param err   The error thrown during request handling (can be AppError or any other error).
 * @param _req  The Express Request object (unused here).
 * @param res   The Express Response object used to send the error response.
 * @param _next The next middleware function (unused; kept for Express API compatibility).
 * @returns     void
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
