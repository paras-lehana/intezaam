/**
 * The What-if tool (feature #37), reachable from every tab: try a change, see the new plan
 * at once, then apply it or leave it.
 *
 * Responsibility: the controls (guests, budget, date, venue, a dropped function), an
 * instant in-browser re-plan with core's engine and its diff (verdict, numbers, risks,
 * tasks, cheapest fix), "Apply this change" (the typed patch, through the page's re-plan),
 * an optional "Explain this change" (one model call, only when asked) and the vendor
 * cancellation check; Escape closes the tool and returns focus to its button. Boundary:
 * nothing changes in the plan until Apply is pressed; the workspace owns the button that
 * shows or hides this tool.
 */
import { type ReactElement, useMemo, useState } from 'react';
import type { PanelProps } from '../panel-props';
import { describePatch } from './describe-patch';
import { ExplainChange } from './ExplainChange';
import { PlanDiffView } from './PlanDiffView';
import { simulatePatch } from './simulate';
import { useCloseOnEscape } from './use-close-on-escape';
import { VendorCancelNote } from './VendorCancelNote';
import { WhatIfControls } from './WhatIfControls';
import { scenarioPatch, startScenario } from './what-if-scenario';
import './what-if.css';

export function WhatIfDrawer({ plan, context, todayIso, onApplyPatch }: PanelProps): ReactElement {
  const rootRef = useCloseOnEscape<HTMLDivElement>();
  const [base, setBase] = useState(context);
  const [scenario, setScenario] = useState(() => startScenario(context));
  // Adjusting state while rendering (React's documented pattern): after a change is applied
  // the plan is new, so the controls start again from "no change".
  if (base !== context) {
    setBase(context);
    setScenario(startScenario(context));
  }
  const patch = useMemo(() => scenarioPatch(scenario, context, plan), [scenario, context, plan]);
  // Efficiency: one engine run per moved control (a few milliseconds), no network.
  const outcome = useMemo(
    () => (patch === null ? null : simulatePatch(context, plan, patch, todayIso)),
    [patch, context, plan, todayIso],
  );
  return (
    <div className="tool" ref={rootRef}>
      <div className="tool-head">
        <h3>What if…</h3>
        <p className="muted">
          Move a control and the plan recomputes instantly in your browser. Nothing changes until
          you press Apply. Escape closes this tool.
        </p>
      </div>
      <div className="tool-body">
        <WhatIfControls plan={plan} context={context} scenario={scenario} onChange={setScenario} />
        <div aria-live="polite">
          {patch === null || outcome === null ? (
            <p className="muted">Move any control above to compare.</p>
          ) : outcome.ok ? (
            <>
              <p>
                <strong>Trying:</strong> {describePatch(patch).join('; ')}.
              </p>
              <PlanDiffView before={plan} after={outcome.value.after} diff={outcome.value.diff} />
            </>
          ) : (
            <p className="field__error" role="alert">
              {outcome.error}
            </p>
          )}
        </div>
        {patch !== null && outcome?.ok === true ? (
          <div className="diff__actions">
            <button
              type="button"
              className="button button--cta"
              onClick={() => onApplyPatch(patch)}
            >
              Apply this change
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setScenario(startScenario(context))}
            >
              Reset
            </button>
            <ExplainChange
              key={describePatch(patch).join('|')}
              context={context}
              todayIso={todayIso}
              patch={patch}
            />
          </div>
        ) : null}
        <VendorCancelNote plan={plan} />
      </div>
    </div>
  );
}
