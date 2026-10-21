/**
 * Instant what-if: apply a typed change in the browser and compare the two plans.
 *
 * Responsibility: `applyPatch` → re-validate the new context (the same schema and planning
 * window the server checks) → `buildPlan` → `diffPlans`, all with core's pure engine, so a
 * slider moves the numbers with no network call and no model call. Boundary: returns a
 * value; nothing is applied to the real plan until the reader presses "Apply".
 */
import { applyPatch, buildPlan, diffPlans } from '@intezaam/core/engine';
import {
  type ContextPatch,
  type EventContext,
  type Plan,
  type PlanDiff,
  MAX_DAYS_AHEAD,
  eventContextSchema,
  isWithinPlanningWindow,
} from '@intezaam/core/schemas';

export interface WhatIfOutcome {
  readonly context: EventContext;
  readonly after: Plan;
  readonly diff: PlanDiff;
}

/** Either the recomputed plan and its diff, or a sentence saying why the change cannot apply. */
export type Simulation =
  | { readonly ok: true; readonly value: WhatIfOutcome }
  | { readonly ok: false; readonly error: string };

const OUTSIDE_WINDOW = `Pick a date within ${MAX_DAYS_AHEAD} days from today.`;
const NOT_PLANNABLE = 'That change cannot be planned — try a smaller step.';

/**
 * A preview plan for an edited context (a venue area, chanda offsets, an access need — fields
 * the typed patch does not carry), or null when the edit is out of bounds.
 * @example
 * previewPlan({ ...context, areaSqft: 3000 }, '2026-10-20')?.space.capacity; // 318 for 8 sq ft a guest
 */
export function previewPlan(context: EventContext, todayIso: string): Plan | null {
  const parsed = eventContextSchema.safeParse(context);
  if (!parsed.success) return null;
  // Efficiency: the same few-millisecond engine run; callers memoise on the edited value.
  const planned = buildPlan(parsed.data, todayIso);
  return planned.ok ? planned.value : null;
}

/**
 * Recomputes the plan with a change applied and diffs it against the current plan.
 * @example
 * const result = simulatePatch(context, plan, { ops: [{ op: 'setGuests', value: 250 }] }, '2026-10-20');
 * if (result.ok) result.value.after.headcount.invited; // 250
 */
export function simulatePatch(
  context: EventContext,
  before: Plan,
  patch: ContextPatch,
  todayIso: string,
): Simulation {
  const parsed = eventContextSchema.safeParse(applyPatch(context, patch));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? NOT_PLANNABLE };
  }
  if (!isWithinPlanningWindow(parsed.data.dateIso, todayIso)) {
    return { ok: false, error: OUTSIDE_WINDOW };
  }
  // Efficiency: one engine run (a few milliseconds); the "before" plan is reused, not rebuilt.
  const planned = buildPlan(parsed.data, todayIso);
  if (!planned.ok) return { ok: false, error: NOT_PLANNABLE };
  return {
    ok: true,
    value: { context: parsed.data, after: planned.value, diff: diffPlans(before, planned.value) },
  };
}
