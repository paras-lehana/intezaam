/**
 * Risk radar (feature #35): every risk with its severity in words and a shape, the cause,
 * the fix and "Why this?".
 *
 * Responsibility: the plan's risks, most severe first (blocker → high → medium → good to
 * know), each as an h4 item with cause and fix. Boundary: display only; severity is never
 * colour alone (SeverityLabel) and the engine decides every risk.
 */
import type { ReactElement } from 'react';
import type { Plan } from '@intezaam/core/schemas';
import { PanelSection } from '../common/PanelSection';
import { RiskList } from '../common/RiskList';
import { SEVERITY_ORDER } from '../common/SeverityLabel';

export interface RiskRadarProps {
  readonly plan: Plan;
}

export function RiskRadar({ plan }: RiskRadarProps): ReactElement {
  const risks = [...plan.risks].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );
  return (
    <PanelSection
      id="safety-risks"
      title="Risk radar"
      lede="What could go wrong, and the fix for each."
    >
      <RiskList plan={plan} risks={risks} className="risks" itemClassName="edge-card" />
    </PanelSection>
  );
}
