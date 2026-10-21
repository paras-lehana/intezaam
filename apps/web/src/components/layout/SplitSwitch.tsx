/**
 * The phone's segmented "Details | Plan" control.
 *
 * Responsibility: two pressed-state buttons that choose which pane a phone shows (the
 * tool-dashboard pattern: one panel at a time below 64 rem). Boundary: controlled — the
 * plan page owns the view so it can jump to the plan after a submit, or back to the
 * details when a field needs fixing. Hidden by CSS on wide screens, where both show.
 */
import type { ReactElement } from 'react';

export const SPLIT_VIEWS = ['details', 'plan'] as const;

export type SplitView = (typeof SPLIT_VIEWS)[number];

export const SPLIT_VIEW_LABELS: Readonly<Record<SplitView, string>> = {
  details: 'Details',
  plan: 'Plan',
};

export interface SplitSwitchProps {
  readonly view: SplitView;
  readonly onViewChange: (view: SplitView) => void;
  /** Shown as a small badge on "Plan" once a plan exists (text, never colour alone). */
  readonly planReady: boolean;
}

export function SplitSwitch({ view, onViewChange, planReady }: SplitSwitchProps): ReactElement {
  return (
    <div className="split-switch" role="group" aria-label="Show on screen">
      {SPLIT_VIEWS.map((option) => (
        <button
          key={option}
          type="button"
          className="split-switch__option"
          aria-pressed={view === option}
          onClick={() => onViewChange(option)}
        >
          {SPLIT_VIEW_LABELS[option]}
          {option === 'plan' && planReady ? (
            <span className="split-switch__badge">ready</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
