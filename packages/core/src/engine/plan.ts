/**
 * buildPlan — THE deterministic planner.
 *
 * Responsibility: validate the context and `todayIso`, run every rule family in order
 * (context, budget, headcount, funding, verdict, cost check, functions, dates, timeline,
 * vendors and payments, permissions, crowd, accessibility, food, space, community, risks,
 * readiness, levers, run sheet), collect the trace and every cited source, and parse the
 * result through `planSchema` so the engine can never ship a plan that breaks its own
 * contract. Boundary: pure — no clock, network or randomness; errors are values.
 */
import { isValidIsoDate } from '../domain/calendar.js';
import { EVENT_KIND_PROFILES } from '../domain/event-kinds.js';
import { appError } from '../errors.js';
import { clipText } from '../format.js';
import { err, ok, type Result } from '../result.js';
import { type EventContext, eventContextSchema } from '../schemas/context.js';
import { MAX_LABEL_CHARS } from '../schemas/limits.js';
import { type ContextEcho, type Plan, planSchema } from '../schemas/plan.js';
import { buildCommunityPlan } from './community.js';
import { buildCore } from './core.js';
import { buildDateNotes } from './dates.js';
import { buildFoodPlan, buildSpaceCheck } from './food.js';
import { buildFunctions } from './functions.js';
import { buildLevers } from './levers.js';
import { buildPayments } from './payments.js';
import { buildPermissions } from './permissions.js';
import { buildReadiness, buildRisks } from './risks.js';
import { buildRunSheet } from './run-sheet.js';
import { buildAccessibility, buildCrowd } from './safety.js';
import { buildTimeline } from './timeline.js';
import { collectSources, createTraceLog } from './trace.js';
import type { NormalisedContext } from './types.js';
import { assembleVerdict, timeVerdict } from './verdict.js';
import { buildVendors } from './vendors.js';

function contextEcho(ctx: NormalisedContext): ContextEcho {
  return {
    family: ctx.family,
    kind: ctx.kind,
    ...(ctx.tradition === null ? {} : { tradition: ctx.tradition }),
    cityName: ctx.cityName,
    ...(ctx.city === null ? {} : { state: ctx.city.state }),
    tier: ctx.tier,
    tierSource: ctx.tierSource,
    ...(ctx.anchor === null ? {} : { anchor: ctx.anchor }),
    scale: ctx.scale,
    ...(ctx.dateIso === null ? {} : { dateIso: ctx.dateIso }),
    daysToEvent: ctx.daysToEvent,
    season: { ...ctx.season, pauses: [...ctx.season.pauses] },
    rainRisk: ctx.rainRisk,
    crowdClass: ctx.crowdClass,
    setting: ctx.setting,
    guests: ctx.guests,
    functions: [...ctx.functions],
    budgetInr: ctx.budgetInr,
    budgetSource: ctx.budgetSource,
    budgetPerGuestInr: ctx.budgetPerGuestInr,
    language: ctx.input.language,
  };
}

function titleOf(ctx: NormalisedContext): string {
  const fallback = `${EVENT_KIND_PROFILES[ctx.kind].label} in ${ctx.cityName}`;
  return clipText(ctx.input.title ?? fallback, MAX_LABEL_CHARS);
}

/** Runs every rule family on a validated context; the result is checked by the caller. */
function assemble(input: EventContext, todayIso: string): Plan {
  const trace = createTraceLog();
  const core = buildCore(input, todayIso, trace);
  const { ctx } = core;
  const layout = buildFunctions(ctx, core.budget, trace);
  const dateNotes = buildDateNotes(ctx, layout.timings, trace);
  const timeline = buildTimeline(ctx, dateNotes, trace);
  const time = timeVerdict(ctx, timeline, trace);
  const verdict = assembleVerdict(ctx, core.money, time, core.funding);
  const vendors = buildVendors(ctx, core, timeline.tasks, trace);
  const permissions = buildPermissions(ctx, trace);
  const food = buildFoodPlan(ctx, trace);
  const space = buildSpaceCheck(ctx, trace);
  const community =
    core.funding === null
      ? null
      : buildCommunityPlan(ctx, core.funding.funding, core.budget, trace);
  const volunteersNeeded =
    community === null ? null : community.volunteers.reduce((sum, role) => sum + role.count, 0);
  const risks = buildRisks(
    {
      ctx,
      verdict,
      permissions,
      costCheck: core.costCheck,
      budget: core.budget,
      space,
      food,
      timeline,
      timings: layout.timings,
      restDayTraceId: layout.restDayTraceId,
      volunteersNeeded,
    },
    trace,
  );
  const plan: Omit<Plan, 'trace' | 'sources'> = {
    todayIso,
    title: titleOf(ctx),
    contextEcho: contextEcho(ctx),
    verdict,
    readiness: buildReadiness(ctx, core.budget, permissions, time.status, trace),
    budget: core.budget,
    costCheck: core.costCheck,
    gst: core.gst,
    levers: buildLevers(input, core, todayIso, trace),
    payments: buildPayments(vendors, trace),
    headcount: core.headcount,
    food,
    space,
    timeline,
    functions: layout.functions,
    runSheet: buildRunSheet(ctx, layout.timings, new Set(vendors.map((v) => v.vendorType)), trace),
    vendors,
    permissions,
    crowd: buildCrowd(ctx, core.contextIds.crowd, trace),
    risks,
    accessibility: buildAccessibility(ctx, trace),
    ...(community === null ? {} : { community }),
  };
  const items = trace.items();
  const sources = collectSources([
    ...items.map((item) => item.sourceIds),
    ...permissions.map((permission) => permission.sourceIds),
    ...dateNotes.map((note) => note.sourceIds),
  ]);
  return { ...plan, trace: items, sources };
}

/**
 * Parses an assembled plan through the wire contract, so the engine can never ship a plan
 * that breaks it; a breach is an INTERNAL error value naming the first three paths.
 * @example
 * checkPlan({}).ok; // false
 */
export function checkPlan(candidate: unknown): Result<Plan> {
  const checked = planSchema.safeParse(candidate);
  if (checked.success) return ok(checked.data);
  const where = checked.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  return err(appError('INTERNAL', undefined, `plan contract: ${where.slice(0, 3).join('; ')}`));
}

/**
 * Builds the complete, explainable plan for a celebration.
 * @example
 * const result = buildPlan(sampleContext('jaipur-wedding', '2026-10-20'), '2026-10-20');
 * if (result.ok) result.value.verdict.headline; // 'Balanced budget · Compressed timeline'
 */
export function buildPlan(context: EventContext, todayIso: string): Result<Plan> {
  if (!isValidIsoDate(todayIso)) {
    return err(appError('VALIDATION_FAILED', 'Today’s date must be a real YYYY-MM-DD date.'));
  }
  const parsed = eventContextSchema.safeParse(context);
  if (!parsed.success) {
    const where = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    return err(appError('VALIDATION_FAILED', undefined, `context: ${where}`));
  }
  return checkPlan(assemble(parsed.data, todayIso));
}
