/**
 * Costed levers: changes that would close a money gap, each with "Apply".
 *
 * Responsibility: list the engine's levers (LEV-01…07, top three by rupees saved) with the
 * saving, the money verdict after the change and "Why this?"; "Apply" sends the lever's
 * typed patch so the whole plan re-plans and the form shows the change. When nothing needs
 * closing the section says so and points to What if, instead of an empty list.
 * Boundary: the engine prices and validates every lever; this only offers them.
 */
import type { ReactElement } from 'react';
import { MONEY_LABELS } from '@intezaam/core/engine';
import type { ContextPatch, Plan } from '@intezaam/core/schemas';
import { MoneyCell } from '../common/MoneyCell';
import { PanelSection } from '../common/PanelSection';
import { TraceDisclosure } from '../common/TraceDisclosure';

export interface LeverListProps {
  readonly plan: Plan;
  readonly onApplyPatch: (patch: ContextPatch) => void;
}

export const NO_LEVERS =
  'Nothing to close: the budget covers the plan as described. Use “What if…” to test a change.';
export const APPLY = 'Apply';

export function LeverList({ plan, onApplyPatch }: LeverListProps): ReactElement {
  return (
    <PanelSection
      id="money-levers"
      title="Levers"
      lede="Changes that free up money, priced by the same rules as the plan."
    >
      {plan.levers.length === 0 ? (
        <p>{NO_LEVERS}</p>
      ) : (
        <ul className="plain-list lever-list" role="list">
          {plan.levers.map(({ patch, ...lever }) => (
            <li key={lever.id} className="lever">
              <h4 className="lever__title">{lever.title}</h4>
              <p>{lever.detail}</p>
              <p className="lever__effect">
                Frees about <MoneyCell amount={lever.savingInr} /> · money verdict after:{' '}
                <strong>{MONEY_LABELS[lever.newMoneyStatus]}</strong>
              </p>
              <div className="lever__actions">
                {patch === undefined ? (
                  <p className="muted">Make this change in the form.</p>
                ) : (
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={() => onApplyPatch(patch)}
                  >
                    {APPLY}
                    <span className="visually-hidden">: {lever.title}</span>
                  </button>
                )}
                <TraceDisclosure plan={plan} traceIds={lever.traceIds} subject={lever.title} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </PanelSection>
  );
}
