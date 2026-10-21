/**
 * Request logging — one structured line per completed request.
 *
 * Responsibility: record the request id, method, route pattern, status, latency and whether
 * the client was identified through Cloudflare or directly. Boundary: never logs bodies, query
 * strings, raw paths (which may carry user data) or IP addresses (personal data).
 */
import type { Request, RequestHandler } from 'express';
import { clientKey } from '../http/client-key.js';
import type { LogSeverity, Logger } from '../logger.js';
import { REQUEST_ID_HEADER } from './request-id.js';

/** Statuses at or above these thresholds are logged with a higher severity. */
const SERVER_ERROR_STATUS = 500;
const CLIENT_ERROR_STATUS = 400;

/** Pattern of the matched route, or a fixed label for static files and fallbacks. */
function routePattern(req: Request): string {
  const route: unknown = req.route;
  if (typeof route === 'object' && route !== null && 'path' in route) {
    return `${req.baseUrl}${String(route.path)}`;
  }
  return req.path.startsWith('/api') ? '/api/*' : 'static';
}

function severityFor(status: number): LogSeverity {
  if (status >= SERVER_ERROR_STATUS) return 'ERROR';
  if (status >= CLIENT_ERROR_STATUS) return 'WARNING';
  return 'INFO';
}

/**
 * Creates the request-log middleware (register it after the request-id middleware).
 * @example
 * app.use(createRequestLog(logger, Date.now));
 */
export function createRequestLog(logger: Logger, now: () => number): RequestHandler {
  return (req, res, next) => {
    const startedAt = now();
    res.on('finish', () => {
      logger.log(severityFor(res.statusCode), 'request', {
        requestId: String(res.getHeader(REQUEST_ID_HEADER) ?? ''),
        method: req.method,
        route: routePattern(req),
        status: res.statusCode,
        latencyMs: now() - startedAt,
        clientSource: clientKey(req.ip, req.get('cf-connecting-ip')).source,
      });
    });
    next();
  };
}
