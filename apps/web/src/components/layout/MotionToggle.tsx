/**
 * Pause / resume decorative animation.
 *
 * Responsibility: one control that stops the page's motion (the verdict stamp, the budget
 * bars filling, the loading spinner) for readers who find it distracting — reduced-motion
 * users never see it in the first place. Boundary: sets `data-motion` via
 * lib/preferences.ts; the CSS motion policy does the stopping.
 */
import { type ReactElement, useEffect, useState } from 'react';
import { applyMotion, initialMotionPaused, storeMotionPaused } from '../../lib/preferences';

export const MOTION_TOGGLE_LABEL = 'Pause animations';

export function MotionToggle(): ReactElement {
  const [paused, setPaused] = useState<boolean>(initialMotionPaused);

  useEffect(() => {
    applyMotion(paused);
  }, [paused]);

  function toggle(): void {
    setPaused(!paused);
    storeMotionPaused(!paused);
  }

  return (
    <button
      type="button"
      className="icon-button"
      aria-pressed={paused}
      title={MOTION_TOGGLE_LABEL}
      onClick={toggle}
    >
      {paused ? (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M8 5.5v13l10-6.5z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M9 6v12M15 6v12" />
        </svg>
      )}
      <span className="visually-hidden">{MOTION_TOGGLE_LABEL}</span>
    </button>
  );
}
