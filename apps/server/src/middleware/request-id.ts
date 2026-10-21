/**
 * Request ids — one id per request, echoed in the `X-Request-Id` response header and the log.
 *
 * Responsibility: keep a caller's id when it is a short safe token (so a support report can be
 * matched to a log line), otherwise mint a fresh one with the injected generator.
 * Boundary: an inbound id that could inject into logs or headers is replaced, never echoed.
 */
import type { RequestHandler } from 'express';

export const REQUEST_ID_HEADER = 'X-Request-Id';

/** Letters, digits and hyphens, 1–64 long: a UUID fits; CR/LF, quotes and spaces never do. */
const SAFE_REQUEST_ID = /^[A-Za-z0-9-]{1,64}$/;

/**
 * Creates the request-id middleware.
 * @example
 * app.use(createRequestId(randomUUID));
 */
export function createRequestId(generate: () => string): RequestHandler {
  return (req, res, next) => {
    const inbound = req.get(REQUEST_ID_HEADER);
    res.setHeader(
      REQUEST_ID_HEADER,
      inbound !== undefined && SAFE_REQUEST_ID.test(inbound) ? inbound : generate(),
    );
    next();
  };
}
