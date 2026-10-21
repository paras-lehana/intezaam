/**
 * Engine barrel (`@intezaam/core/engine`) — the pure, deterministic planner.
 *
 * Responsibility: the browser-safe entry point for the SPEC-API engine functions —
 * `buildPlan`, `normaliseContext`, `applyPatch`, `diffPlans`, `summarisePlanFacts` — plus
 * the trace log and the money-core helpers the server and web reuse. Boundary: pure
 * functions only; no prompts, network or clock.
 */
export { classifyContext, normaliseContext, resolveFunctions } from './context.js';
export { diffPlans } from './diff.js';
export { summarisePlanFacts } from './facts.js';
export { buildPlan } from './plan.js';
export { collectSources, createTraceLog, type TraceLog, type TraceSpec } from './trace.js';
export type { ClassifiedContext, NormalisedContext, SeasonInfo, ShareTable } from './types.js';
export { applyPatch } from './what-if.js';
export { MONEY_LABELS } from './verdict-money.js';
export { FUNDING_LABELS, TIME_LABELS } from './verdict.js';
