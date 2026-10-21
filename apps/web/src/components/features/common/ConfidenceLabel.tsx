/**
 * The confidence grade of a number, in words, with an "Assumption" badge for grade D.
 *
 * Responsibility: show every reader how solid a figure is — A law or official guidance,
 * B survey, C published industry estimate, D our assumption — so an estimate is never read
 * as a quote. Boundary: words from core's CONFIDENCE_LABELS; no colour-only signal.
 */
import type { ReactElement } from 'react';
import { CONFIDENCE_LABELS, type Confidence } from '@intezaam/core/domain';

export interface ConfidenceLabelProps {
  readonly grade: Confidence;
  /** The rule flagged its value as an assumption (grade D logic or a grade-D input). */
  readonly assumption: boolean;
}

export const ASSUMPTION_BADGE = 'Assumption';

export function ConfidenceLabel({ grade, assumption }: ConfidenceLabelProps): ReactElement {
  return (
    <span className="confidence">
      <span className="confidence__grade">
        Grade {grade} · {CONFIDENCE_LABELS[grade]}
      </span>
      {assumption || grade === 'D' ? (
        <span className="badge badge--assumption">{ASSUMPTION_BADGE}</span>
      ) : null}
    </span>
  );
}
