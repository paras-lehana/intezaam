/**
 * POST /api/plan/what-if — recompute the plan after a whitelisted change and diff the two.
 *
 * Responsibility: wire body parser → server-clock check of `todayIso` → schema validation →
 * core what-if → envelope. Boundary: no model call, so it sits behind the general API limiter
 * only, not the AI limiter; the browser runs the same core code for its instant what-if.
 */
import { whatIfRequestSchema } from '@intezaam/core';
import type { Router } from 'express';
import { sendResult } from '../http/respond.js';
import { validate } from '../middleware/validate.js';
import { runWhatIf } from '../services/what-if.js';
import type { RouteContext } from './context.js';

/**
 * Registers the what-if route.
 * @example
 * registerWhatIf(api, ctx);
 */
export function registerWhatIf(router: Router, ctx: RouteContext): void {
  router.post(
    '/plan/what-if',
    ctx.smallJson,
    ctx.serverToday,
    validate(whatIfRequestSchema, (body, _req, res) => {
      sendResult(res, runWhatIf(body));
    }),
  );
}
