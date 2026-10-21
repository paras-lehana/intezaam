/**
 * Route context — everything a route module needs, built once in server.ts.
 *
 * Responsibility: one typed bag of services and middleware so route files stay declarative.
 * Boundary: no logic; construction happens in buildApp.
 */
import type { RequestHandler } from 'express';
import type { ServerConfig } from '../config.js';
import type { AppServices } from '../services/app-services.js';
import type { GenAiClient } from '../services/genai-client.js';

export interface RouteContext {
  readonly config: ServerConfig;
  /** The model client as configured, for the health report (configured flag, model names). */
  readonly genai: GenAiClient;
  /** Services built over the gated client: only their model calls take a concurrency slot. */
  readonly services: AppServices;
  /** Stricter per-client limiter for the model-backed routes. */
  readonly aiLimiter: RequestHandler;
  /** Strictest per-client limiter, for quote-file reads (the costliest model call). */
  readonly fileLimiter: RequestHandler;
  /** JSON parser with the default (small) body limit. */
  readonly smallJson: RequestHandler;
  /** JSON parser sized for one base64 quote file, used only by POST /api/quotes/read. */
  readonly fileJson: RequestHandler;
  /** Rejects a `todayIso` more than a day from the server's date in India (before validation). */
  readonly serverToday: RequestHandler;
}
