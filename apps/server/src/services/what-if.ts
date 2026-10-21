/**
 * What-if — POST /api/plan/what-if, with no model call.
 *
 * Responsibility: build the plan for the posted context, apply the whitelisted patch, re-check
 * the patched context against the full context schema and the planning window (a patch can
 * create a combination the schema forbids), build the new plan and diff the two.
 * Boundary: pure; the browser runs the same core code for its instant what-if.
 */
import {
  type Result,
  type WhatIfRequest,
  type WhatIfResponse,
  appError,
  applyPatch,
  buildPlan,
  diffPlans,
  err,
  eventContextSchema,
  isWithinPlanningWindow,
  ok,
} from '@intezaam/core';

/** Fixed copy: the patch values are user input and are never echoed. */
const PATCH_REJECTED = 'context: that change does not fit this plan; try a different value.';

/**
 * Recomputes the plan after a patch and lists what changed.
 * @example
 * runWhatIf({ context, todayIso: '2026-10-20', patch: { ops: [{ op: 'setGuests', value: 250 }] } });
 * // ok({ before, after, diff })
 */
export function runWhatIf(req: WhatIfRequest): Result<WhatIfResponse> {
  const before = buildPlan(req.context, req.todayIso);
  if (!before.ok) return before;
  const patched = eventContextSchema.safeParse(applyPatch(req.context, req.patch));
  if (!patched.success || !isWithinPlanningWindow(patched.data.dateIso, req.todayIso)) {
    return err(appError('VALIDATION_FAILED', PATCH_REJECTED));
  }
  const after = buildPlan(patched.data, req.todayIso);
  if (!after.ok) return after;
  return ok({
    before: before.value,
    after: after.value,
    diff: diffPlans(before.value, after.value),
  });
}
