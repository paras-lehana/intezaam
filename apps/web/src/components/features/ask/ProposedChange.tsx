/**
 * A change Ask proposed, shown as a diff with an Apply button — never applied on its own.
 *
 * Responsibility: describe the typed patch in words, re-plan it in the browser against the
 * current plan (core's engine) and show what it does; only "Apply this change" sends it to
 * the page's re-plan. Boundary: a patch the engine cannot plan is shown with the reason and
 * no button; once applied, the turn says so instead of offering it twice.
 */
import { type ReactElement, useMemo, useState } from 'react';
import type { ContextPatch, EventContext, Plan } from '@intezaam/core/schemas';
import { describePatch } from '../what-if/describe-patch';
import { PlanDiffView } from '../what-if/PlanDiffView';
import { simulatePatch } from '../what-if/simulate';

export interface ProposedChangeProps {
  readonly patch: ContextPatch;
  readonly plan: Plan;
  readonly context: EventContext;
  readonly todayIso: string;
  readonly onApplyPatch: (patch: ContextPatch) => void;
}

export function ProposedChange({
  patch,
  plan,
  context,
  todayIso,
  onApplyPatch,
}: ProposedChangeProps): ReactElement {
  const [applied, setApplied] = useState(false);
  // Efficiency: one engine run per proposal, not per render.
  const outcome = useMemo(
    () => (applied ? null : simulatePatch(context, plan, patch, todayIso)),
    [applied, context, plan, patch, todayIso],
  );

  function apply(): void {
    setApplied(true);
    onApplyPatch(patch);
  }

  return (
    <div className="ask-proposal">
      <p>
        <strong>Proposed change:</strong> {describePatch(patch).join('; ')}.
      </p>
      {applied ? (
        <p role="status">
          <span aria-hidden="true">✓</span> Applied to your plan.
        </p>
      ) : outcome === null ? null : outcome.ok ? (
        <>
          <PlanDiffView before={plan} after={outcome.value.after} diff={outcome.value.diff} />
          <button type="button" className="button button--cta" onClick={apply}>
            Apply this change
          </button>
        </>
      ) : (
        <p className="field__error">{outcome.error}</p>
      )}
    </div>
  );
}
