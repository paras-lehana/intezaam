/**
 * Crowd safety by footfall (NDMA 2014 checks, CROWD-01…05).
 *
 * Responsibility: the expected footfall, its crowd class in words, and the checks the
 * engine switched on for it (exits and first aid always; staff above 200; queues, PA and a
 * missing-children desk above 500; an ambulance and a drill above 1,000). Boundary: display
 * only; the thresholds live in core's crowd table.
 */
import type { ReactElement } from 'react';
import { CROWD_CLASS_MAX, type CrowdClass } from '@intezaam/core/domain';
import type { Plan } from '@intezaam/core/schemas';
import { PanelSection } from '../common/PanelSection';
import { TraceDisclosure } from '../common/TraceDisclosure';

export interface CrowdSafetyProps {
  readonly plan: Plan;
}

/** Each class in words, with its footfall band from core's table. */
export const CROWD_CLASS_TEXT: Readonly<Record<CrowdClass, string>> = {
  small: `a small gathering (up to ${CROWD_CLASS_MAX.small})`,
  medium: `a medium crowd (up to ${CROWD_CLASS_MAX.medium})`,
  large: `a large crowd (up to ${CROWD_CLASS_MAX.large})`,
  'very-large': `a very large crowd (over ${CROWD_CLASS_MAX.large})`,
};

export function CrowdSafety({ plan }: CrowdSafetyProps): ReactElement {
  const { crowd } = plan;
  return (
    <PanelSection
      id="safety-crowd"
      title="Crowd safety"
      lede={`About ${crowd.footfall} people at the busiest time: ${CROWD_CLASS_TEXT[crowd.crowdClass]}.`}
    >
      <ul className="safety-checks">
        {crowd.checks.map((check) => (
          <li key={check.id}>{check.title}</li>
        ))}
      </ul>
      <TraceDisclosure plan={plan} traceIds={crowd.traceIds} subject="the crowd checks" />
    </PanelSection>
  );
}
