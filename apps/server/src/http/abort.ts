/**
 * Abort on client disconnect (research note 09 Gap 4 §4.4).
 *
 * Responsibility: give each AI request an AbortSignal that fires when the client leaves before
 * the response is sent, so pending and follow-up model calls stop and do not spend quota.
 * Uses the RESPONSE's `close` with `!res.writableEnded`: the request's `close` fires as soon as
 * the body has been read, which would abort every call. Boundary: wiring only.
 */
import type { Response } from 'express';

/**
 * A signal that aborts when the connection closes before the response ended.
 * @example
 * const signal = abortOnClose(res); await service.plan(body, signal);
 */
export function abortOnClose(res: Response): AbortSignal {
  const controller = new AbortController();
  res.on('close', () => {
    // Efficiency: a client that left gets no further model attempts.
    if (!res.writableEnded) controller.abort();
  });
  return controller.signal;
}
