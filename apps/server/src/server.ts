/**
 * Express application factory — API plus static web, fully dependency-injected.
 *
 * Responsibility: assemble request ids, logging, security headers, compression, body limits,
 * per-client rate limits, routes, static serving and the error envelope in the right order.
 * Boundary: no listening, no env reads, no real clock or random ids — index.ts supplies those,
 * so tests build the exact production app with fakes.
 */
import { appError } from '@intezaam/core';
import compression from 'compression';
import express, { type Express, type Request } from 'express';
import type { ServerConfig } from './config.js';
import { clientKey } from './http/client-key.js';
import { sendError } from './http/respond.js';
import { permissionsPolicy, securityHeaders } from './http/security-headers.js';
import type { Logger } from './logger.js';
import { createErrorHandler } from './middleware/error-handler.js';
import { createRateLimiter } from './middleware/rate-limit.js';
import { createRequestId } from './middleware/request-id.js';
import { createRequestLog } from './middleware/request-log.js';
import { requireServerToday } from './middleware/server-today.js';
import { registerAiRoutes } from './routes/ai.js';
import type { RouteContext } from './routes/context.js';
import { registerGoogleServices } from './routes/google-services.js';
import { registerHealth } from './routes/health.js';
import { registerWhatIf } from './routes/what-if.js';
import { createAppServices } from './services/app-services.js';
import { createConcurrencyGate } from './services/concurrency.js';
import { gateModelCalls } from './services/gated-genai.js';
import type { GenAiClient } from './services/genai-client.js';
import { registerStaticWeb } from './static-web.js';

// The limits a test drives (the AI and file buckets, the gate) are exported so tests derive
// their bursts from these values and can never drift from a hand-typed copy.

/** Model-backed routes cost free-tier quota; 30 a minute per client is generous for a person. */
export const AI_REQUESTS_PER_MINUTE = 30;

/**
 * A quote-file read is the costliest call (about 1.6k input tokens per photo, 09 Gap 4 §4.2.3);
 * a family compares at most three quotes, so six a minute allows two full comparisons.
 */
export const FILE_READS_PER_MINUTE = 6;

/** Everything else (health, catalog, what-if). */
const API_REQUESTS_PER_MINUTE = 120;

/** Simultaneous model calls per instance: the gateway allows the container 30 calls a minute. */
export const MAX_IN_FLIGHT_AI = 4;

/** Every JSON route except the file read: a context plus three 4,000-character quotes fits. */
const DEFAULT_BODY_LIMIT = '64kb';

/** 3 MiB: one 2 MiB file grows to about 2.67 MiB as base64, plus the JSON wrapper (09 Gap 4). */
const FILE_BODY_LIMIT_BYTES = 3 * 1024 * 1024;

export interface AppDeps {
  readonly genai: GenAiClient;
  readonly now: () => number;
  readonly logger: Logger;
  /** Mints a request id when the caller did not send a safe one. */
  readonly newRequestId: () => string;
}

/** The Cloudflare-aware client key every limiter uses. */
function keyOf(req: Request): string {
  return clientKey(req.ip, req.get('cf-connecting-ip')).key;
}

/**
 * Builds the Express app.
 * @example
 * const app = buildApp(loadConfig(), { genai, now: Date.now, logger, newRequestId: randomUUID });
 */
export function buildApp(config: ServerConfig, deps: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by');
  // Traefik is the one trusted hop; the Cloudflare hop is proven by client-key.ts instead.
  app.set('trust proxy', config.trustProxyHops);
  app.use(createRequestId(deps.newRequestId));
  app.use(createRequestLog(deps.logger, deps.now));
  app.use(securityHeaders());
  app.use(permissionsPolicy());
  // Efficiency: a plan is tens of kilobytes of JSON; gzip cuts it several times over.
  app.use(compression());

  const limiter = (perMinute: number) => createRateLimiter({ perMinute, now: deps.now, keyOf });
  // Efficiency: only model calls take a slot, so a cache hit or a rule answer never waits or
  // gets a 429 behind slow narrations; a call that finds no slot serves the offline twin.
  const gatedGenai = gateModelCalls(deps.genai, createConcurrencyGate(MAX_IN_FLIGHT_AI));
  const ctx: RouteContext = {
    config,
    genai: deps.genai,
    services: createAppServices({ genai: gatedGenai, now: deps.now, logger: deps.logger }),
    aiLimiter: limiter(AI_REQUESTS_PER_MINUTE),
    fileLimiter: limiter(FILE_READS_PER_MINUTE),
    smallJson: express.json({ limit: DEFAULT_BODY_LIMIT }),
    fileJson: express.json({ limit: FILE_BODY_LIMIT_BYTES }),
    serverToday: requireServerToday(deps.now),
  };

  const api = express.Router();
  api.use(limiter(API_REQUESTS_PER_MINUTE));
  api.use((_req, res, next) => {
    // API responses can carry plan details and quote text; never let shared caches keep them.
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  registerHealth(api, ctx);
  registerGoogleServices(api);
  registerWhatIf(api, ctx);
  registerAiRoutes(api, ctx);
  api.use((_req, res) => sendError(res, appError('NOT_FOUND')));
  app.use('/api', api);

  registerStaticWeb(app, config.webDistDir);
  app.use((_req, res) => sendError(res, appError('NOT_FOUND')));
  app.use(createErrorHandler(deps.logger));
  return app;
}
