/**
 * The readiness score (0–100) and the four factors it adds up from.
 *
 * Responsibility: one number that says how far along the plan is — core vendors booked,
 * permissions in hand, contingency intact, time in hand — as a native <meter> with the
 * score in words and each factor's points, plus "Why this?". Boundary: display only; the
 * engine computes the score (READY-01).
 */
import type { ReactElement } from 'react';
import type { Plan } from '@intezaam/core/schemas';
import { PanelSection } from '../common/PanelSection';
import { TraceDisclosure } from '../common/TraceDisclosure';

export interface ReadinessScoreProps {
  readonly plan: Plan;
}

/** The score's scale (core readinessSchema caps it at 100). */
export const READINESS_MAX = 100;
/** Below half, the plan needs attention; at three quarters it is in good shape. */
const READINESS_LOW = 50;
const READINESS_HIGH = 75;

export function ReadinessScore({ plan }: ReadinessScoreProps): ReactElement {
  const { score, factors, traceIds } = plan.readiness;
  return (
    <PanelSection id="overview-readiness" title="Readiness">
      <p className="readiness__score">
        <span className="readiness__number">{score}</span> out of {READINESS_MAX}
      </p>
      <meter
        className="readiness__meter"
        aria-label="Readiness score"
        min={0}
        max={READINESS_MAX}
        low={READINESS_LOW}
        high={READINESS_HIGH}
        optimum={READINESS_MAX}
        value={score}
      />
      <ul className="plain-list readiness__factors" role="list">
        {factors.map((factor) => (
          <li key={factor.key} className="readiness__factor">
            <span>{factor.label}</span>
            <span className="readiness__points">
              {factor.points} of {factor.max}
            </span>
          </li>
        ))}
      </ul>
      <TraceDisclosure plan={plan} traceIds={traceIds} subject="Readiness score" />
    </PanelSection>
  );
}
