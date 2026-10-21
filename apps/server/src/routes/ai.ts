/**
 * The model-backed routes: the five GenAI jobs (GENAI_ARCHITECTURE.md) and the quote-file read.
 *
 * Responsibility: wire every route the same thin way — per-client limiter → body parser with
 * the route's size limit → server-clock check of `todayIso` → schema validation → service →
 * envelope — and hand each service an AbortSignal tied to the client's connection. Boundary:
 * no logic; services orchestrate, core holds every rule, and the concurrency cap sits on the
 * model client itself (services/gated-genai.ts), so a cache hit or a rule answer never waits.
 */
import {
  type Result,
  askRequestSchema,
  briefRequestSchema,
  draftRequestSchema,
  planRequestSchema,
  quoteReadRequestSchema,
  quotesRequestSchema,
} from '@intezaam/core';
import type { RequestHandler, Router } from 'express';
import type { z } from 'zod';
import { abortOnClose } from '../http/abort.js';
import { sendResult } from '../http/respond.js';
import { validate } from '../middleware/validate.js';
import type { RouteContext } from './context.js';

/** A service call: the validated body and the client's abort signal. */
type Job<T, R> = (body: T, signal: AbortSignal) => Promise<Result<R>>;

/** The handler chain one AI route runs, in order. */
function aiChain<S extends z.ZodType, R>(
  guards: readonly RequestHandler[],
  schema: S,
  job: Job<z.output<S>, R>,
): RequestHandler[] {
  return [
    ...guards,
    validate(schema, async (body, _req, res) => {
      sendResult(res, await job(body, abortOnClose(res)));
    }),
  ];
}

/**
 * Registers POST /brief, /plan, /plan/narration, /quotes/compare, /quotes/read, /drafts and /ask.
 * @example
 * registerAiRoutes(api, ctx);
 */
export function registerAiRoutes(router: Router, ctx: RouteContext): void {
  const { briefs, plans, quotes, quoteReader, drafts, asks } = ctx.services;
  // Every JSON job carries `todayIso`, so each is checked against the server clock.
  const json = [ctx.aiLimiter, ctx.smallJson, ctx.serverToday];
  router.post(
    '/brief',
    ...aiChain(json, briefRequestSchema, (body, sig) => briefs.read(body, sig)),
  );
  router.post('/plan', ...aiChain(json, planRequestSchema, (body, sig) => plans.plan(body, sig)));
  // Efficiency: the browser builds the plan itself, so it asks for the narration alone.
  router.post(
    '/plan/narration',
    ...aiChain(json, planRequestSchema, (body, sig) => plans.narrate(body, sig)),
  );
  router.post(
    '/quotes/compare',
    ...aiChain(json, quotesRequestSchema, (body, sig) => quotes.compare(body, sig)),
  );
  // Security: the only route with the larger body limit, behind the strictest limiter; a
  // file read carries no date, so it has no server-clock check.
  router.post(
    '/quotes/read',
    ...aiChain(
      [ctx.aiLimiter, ctx.fileLimiter, ctx.fileJson],
      quoteReadRequestSchema,
      (body, sig) => quoteReader.read(body, sig),
    ),
  );
  router.post(
    '/drafts',
    ...aiChain(json, draftRequestSchema, (body, sig) => drafts.draft(body, sig)),
  );
  router.post('/ask', ...aiChain(json, askRequestSchema, (body, sig) => asks.ask(body, sig)));
}
