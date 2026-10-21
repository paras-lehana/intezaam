/**
 * Response helpers — the single place an `AppError` becomes an HTTP response.
 *
 * Responsibility: the uniform `{ error: PublicError }` envelope and status mapping.
 * Boundary: `internalHint` never leaves the process (toPublicError strips it).
 */
import { type AppError, type Result, httpStatusFor, toPublicError } from '@intezaam/core';
import type { Response } from 'express';

/**
 * Sends the uniform error envelope with the status mapped from the error code.
 * @example
 * sendError(res, appError('NOT_FOUND')); // 404 { error: { code: 'NOT_FOUND', message } }
 */
export function sendError(res: Response, error: AppError): void {
  res.status(httpStatusFor(error.code)).json({ error: toPublicError(error) });
}

/**
 * Sends a successful value in JSON, or the error envelope for a failed result.
 * @example
 * sendResult(res, await plans.plan(body, signal));
 */
export function sendResult<T>(res: Response, result: Result<T>): void {
  if (result.ok) {
    res.json(result.value);
    return;
  }
  sendError(res, result.error);
}
