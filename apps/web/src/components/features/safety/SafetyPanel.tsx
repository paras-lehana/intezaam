/**
 * The Safety tab: permissions, crowd safety, the risk radar and the
 * accessibility and elders plan.
 *
 * Responsibility: compose the four Safety sections in the order a committee works through
 * them — what to apply for, how to handle the crowd, what could go wrong, who needs care.
 * Boundary: composition only; every rule is core's, and the authorities are "verify locally".
 */
import type { ReactElement } from 'react';
import { PanelHeader } from '../common/PanelHeader';
import type { PanelProps } from '../panel-props';
import { AccessPlan } from './AccessPlan';
import { CrowdSafety } from './CrowdSafety';
import { PermissionsChecklist } from './PermissionsChecklist';
import { RiskRadar } from './RiskRadar';
import './safety.css';

export function SafetyPanel({ plan, context, todayIso }: PanelProps): ReactElement {
  return (
    <div className="safety">
      <PanelHeader title="Safety">
        Permissions, crowd safety, risks and care for elders — from India’s noise rules, the NDMA
        crowd guide and the 2021 accessibility guidelines.
      </PanelHeader>
      <PermissionsChecklist plan={plan} />
      <CrowdSafety plan={plan} />
      <RiskRadar plan={plan} />
      <AccessPlan plan={plan} context={context} todayIso={todayIso} />
    </div>
  );
}
