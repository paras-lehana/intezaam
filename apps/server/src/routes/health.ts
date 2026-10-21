/**
 * GET /api/health — liveness plus AI configuration, used by the deploy smoke test.
 *
 * Responsibility: answer the container health check and the smoke test with the app version
 * and whether the GenAI path is live, so a deploy can prove it is not silently offline.
 * Boundary: reports the version, whether the AI gateway is configured and the model names,
 * never a key or a URL.
 */
import type { HealthResponse } from '@intezaam/core';
import type { Router } from 'express';
import type { RouteContext } from './context.js';

/**
 * Registers the health route.
 * @example
 * registerHealth(api, ctx); // GET /api/health → { status: 'ok', version, ai }
 */
export function registerHealth(router: Router, ctx: RouteContext): void {
  router.get('/health', (_req, res) => {
    const body: HealthResponse = {
      status: 'ok',
      version: ctx.config.appVersion,
      ai: { configured: ctx.genai.configured, models: [...ctx.genai.models] },
    };
    res.json(body);
  });
}
