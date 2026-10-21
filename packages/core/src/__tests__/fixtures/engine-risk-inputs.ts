/**
 * Risk-probe inputs — the plan sections a risk probe reads, built by the engine.
 *
 * Responsibility: run the same rule families buildPlan runs before the risk radar (money
 * core, functions, dates, timeline, verdict, permissions, food, space) for a context, so a
 * risk test can start from real sections and change only the field it owns. Boundary: test
 * support only; every value comes from the engine.
 */
import { buildCore } from '../../engine/core.js';
import { buildDateNotes } from '../../engine/dates.js';
import { buildFoodPlan, buildSpaceCheck } from '../../engine/food.js';
import { buildFunctions } from '../../engine/functions.js';
import { buildPermissions } from '../../engine/permissions.js';
import type { Probe, RiskDraft, RiskInputs } from '../../engine/risk-probes.js';
import { buildTimeline } from '../../engine/timeline.js';
import { createTraceLog } from '../../engine/trace.js';
import { assembleVerdict, timeVerdict } from '../../engine/verdict.js';
import type { EventContext } from '../../schemas/context.js';
import { clean, TODAY } from './engine-contexts.js';

/** The sections the risk radar reads for a context (no community volunteers by default). */
export function riskInputsOf(context: EventContext): RiskInputs {
  const trace = createTraceLog();
  const core = buildCore(clean(context), TODAY, trace);
  const { ctx } = core;
  const layout = buildFunctions(ctx, core.budget, trace);
  const timeline = buildTimeline(ctx, buildDateNotes(ctx, layout.timings, trace), trace);
  const time = timeVerdict(ctx, timeline, trace);
  return {
    ctx,
    verdict: assembleVerdict(ctx, core.money, time, core.funding),
    permissions: buildPermissions(ctx, trace),
    costCheck: core.costCheck,
    budget: core.budget,
    space: buildSpaceCheck(ctx, trace),
    food: buildFoodPlan(ctx, trace),
    timeline,
    timings: layout.timings,
    restDayTraceId: layout.restDayTraceId,
    volunteersNeeded: null,
  };
}

/** The risk with this id that any of the probes raises, if one does. */
export function riskFrom(
  probes: readonly Probe[],
  inputs: RiskInputs,
  id: string,
): RiskDraft | undefined {
  return probes.map((probe) => probe(inputs)).find((draft) => draft?.id === id) ?? undefined;
}
