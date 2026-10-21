/**
 * A visually hidden live region for announcements (a recalculated budget, a filled form).
 *
 * Responsibility: one place that renders `aria-live` text correctly — the region exists
 * from the first render (screen readers ignore regions inserted together with their text)
 * and only its content changes. Boundary: the caller decides what to say and when.
 */
import type { ReactElement } from 'react';

export interface LiveRegionProps {
  readonly message: string;
  /** `polite` waits for the reader to finish; `assertive` interrupts (errors only). */
  readonly politeness?: 'polite' | 'assertive';
  /** Show the text instead of hiding it (e.g. a status line under a button). */
  readonly visible?: boolean;
  readonly className?: string;
}

export function LiveRegion({
  message,
  politeness = 'polite',
  visible = false,
  className,
}: LiveRegionProps): ReactElement {
  const base = visible ? 'live-region' : 'visually-hidden';
  return (
    <p
      className={className === undefined ? base : `${base} ${className}`}
      role={politeness === 'assertive' ? 'alert' : 'status'}
      aria-live={politeness}
      aria-atomic="true"
    >
      {message}
    </p>
  );
}
