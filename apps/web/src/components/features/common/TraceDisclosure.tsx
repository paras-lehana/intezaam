/**
 * "Why this?" — the disclosure behind every number in the workspace.
 *
 * Responsibility: a real button (aria-expanded + aria-controls) that reveals the trace
 * items behind a plan item: rule, inputs used, effect, grade and sources. The button's
 * accessible name adds what it explains ("Why this? Venue and rentals"), so a screen-reader
 * list of buttons is never a column of identical names. Boundary: renders nothing when no
 * trace id resolves — a "Why this?" with no answer would be a dead button.
 */
import { type ReactElement, useId, useState } from 'react';
import type { Plan } from '@intezaam/core/schemas';
import { traceItemsFor } from './trace-lookup';
import { TraceItemView } from './TraceItemView';

export interface TraceDisclosureProps {
  readonly plan: Plan;
  readonly traceIds: readonly string[];
  /** What the number is about, read after "Why this?" by assistive technology. */
  readonly subject: string;
}

export const WHY_THIS = 'Why this?';

export function TraceDisclosure({
  plan,
  traceIds,
  subject,
}: TraceDisclosureProps): ReactElement | null {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const items = traceItemsFor(plan, traceIds);
  if (items.length === 0) return null;
  return (
    <div className="trace">
      <button
        type="button"
        className="trace__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        {WHY_THIS} <span className="visually-hidden">{subject}</span>
      </button>
      <div id={panelId} className="trace__panel" hidden={!open}>
        {/* Efficiency: the rule text and source links render only once the reader asks. */}
        {open ? (
          <ul className="plain-list trace__items" role="list">
            {items.map((item) => (
              <li key={item.id}>
                <TraceItemView item={item} plan={plan} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
