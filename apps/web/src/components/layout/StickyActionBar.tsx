/**
 * The phone's sticky bottom bar with the one primary action ("Update plan").
 *
 * Responsibility: keep the main action under the thumb on small screens. The button
 * submits the planner form through the native `form` attribute, so it works from either
 * pane without any wiring. Boundary: hidden by CSS on wide screens (the form has its own
 * button there); split.css reserves space so the bar never covers focused content
 * (WCAG 2.4.11).
 */
import type { ReactElement, ReactNode } from 'react';

export interface StickyActionBarProps {
  /** The id of the <form> this bar submits. */
  readonly formId: string;
  readonly label: string;
  /** Optional one-line status beside the button (e.g. "Plan updated"). */
  readonly status?: ReactNode;
}

export function StickyActionBar({ formId, label, status }: StickyActionBarProps): ReactElement {
  return (
    <div className="action-bar">
      {status === undefined ? null : <p className="action-bar__status">{status}</p>}
      <button type="submit" form={formId} className="button button--cta action-bar__button">
        {label}
      </button>
    </div>
  );
}
