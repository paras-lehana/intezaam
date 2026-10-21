/**
 * A risk's severity as words plus a shape — never colour alone (WCAG 1.4.1).
 *
 * Responsibility: one label per severity on the RISK ladder (blocker → info), each with a
 * distinct glyph so it also reads in greyscale and print. Boundary: display only; the
 * engine decides the severity.
 */
import type { ReactElement } from 'react';
import type { RiskSeverity } from '@intezaam/core/schemas';

interface SeverityStyle {
  readonly label: string;
  /** A distinct shape per level; decorative, since the label carries the meaning. */
  readonly glyph: string;
}

export const SEVERITY_STYLES: Readonly<Record<RiskSeverity, SeverityStyle>> = {
  blocker: { label: 'Must fix', glyph: '✕' },
  high: { label: 'High risk', glyph: '▲' },
  medium: { label: 'Medium risk', glyph: '◆' },
  info: { label: 'Good to know', glyph: '●' },
};

/** Most severe first, for sorting risk lists. */
export const SEVERITY_ORDER: Readonly<Record<RiskSeverity, number>> = {
  blocker: 0,
  high: 1,
  medium: 2,
  info: 3,
};

export interface SeverityLabelProps {
  readonly severity: RiskSeverity;
}

export function SeverityLabel({ severity }: SeverityLabelProps): ReactElement {
  const style = SEVERITY_STYLES[severity];
  return (
    <span className={`severity severity--${severity}`}>
      <span className="severity__glyph" aria-hidden="true">
        {style.glyph}
      </span>
      {style.label}
    </span>
  );
}
