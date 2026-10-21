/**
 * A spend line's status in words plus a shape: within plan, near the limit, or over.
 *
 * Responsibility: one label per tracker status so the warning at 90% and the overrun are
 * never shown by colour alone (WCAG 1.4.1). Boundary: display only.
 */
import type { ReactElement } from 'react';
import type { SpendStatus } from './spend-tracker';

interface StatusStyle {
  readonly label: string;
  readonly glyph: string;
}

export const SPEND_STATUS_STYLES: Readonly<Record<SpendStatus, StatusStyle>> = {
  clear: { label: 'Within plan', glyph: '✓' },
  near: { label: 'Near the limit', glyph: '▲' },
  over: { label: 'Over the line', glyph: '✕' },
};

export interface SpendStatusLabelProps {
  readonly status: SpendStatus;
}

export function SpendStatusLabel({ status }: SpendStatusLabelProps): ReactElement {
  const style = SPEND_STATUS_STYLES[status];
  return (
    <span className={`spend-status spend-status--${status}`}>
      <span aria-hidden="true">{style.glyph}</span> {style.label}
    </span>
  );
}
