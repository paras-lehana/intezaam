/**
 * The three most serious risks, each with its fix.
 *
 * Responsibility: lead with what could go wrong — severity as words and a shape, the cause
 * in your terms, the fix, and "Why this?" — most severe first. The full radar lives on the
 * Safety tab. Boundary: display only; the engine ranks severity (RISK ladder).
 */
import type { ReactElement } from 'react';
import type { Plan, Risk } from '@intezaam/core/schemas';
import { PanelSection } from '../common/PanelSection';
import { RiskList } from '../common/RiskList';
import { SEVERITY_ORDER } from '../common/SeverityLabel';

export interface TopRisksProps {
  readonly plan: Plan;
}

/** Three risks fit a phone screen; the Safety tab lists the rest. */
export const TOP_RISK_COUNT = 3;

/**
 * The most severe risks, stable within a severity (the engine's order).
 * @example
 * topRisks(plan.risks)[0]?.severity; // 'blocker' when the plan breaks the night noise ban
 */
export function topRisks(risks: readonly Risk[]): readonly Risk[] {
  return [...risks]
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .slice(0, TOP_RISK_COUNT);
}

export function TopRisks({ plan }: TopRisksProps): ReactElement {
  const risks = topRisks(plan.risks);
  return (
    <PanelSection
      id="overview-risks"
      title="Top risks"
      lede={
        plan.risks.length > TOP_RISK_COUNT
          ? `The ${TOP_RISK_COUNT} most serious of ${plan.risks.length}; the Safety tab lists them all.`
          : undefined
      }
    >
      <RiskList plan={plan} risks={risks} className="risk-list" />
    </PanelSection>
  );
}
