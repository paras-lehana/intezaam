/**
 * Money: the split, how to adjust it, per function, the bottom-up check, GST, levers, the
 * payment calendar and the spend tracker.
 *
 * Responsibility: compose the budget tab from its sections, each with
 * "Why this?" on its numbers; the controls and levers re-plan through `onApplyPatch`.
 * Boundary: loaded lazily the first time the tab opens.
 */
import type { ReactElement } from 'react';
import { PanelHeader } from '../common/PanelHeader';
import type { PanelProps } from '../panel-props';
import { BudgetTable } from './BudgetTable';
import { CategoryControls } from './CategoryControls';
import { CostCheck } from './CostCheck';
import { FunctionSlices } from './FunctionSlices';
import { GstView } from './GstView';
import { LeverList } from './LeverList';
import { PaymentsCalendar } from './PaymentsCalendar';
import { SpendTracker } from './SpendTracker';
import './money.css';

export function MoneyPanel({ plan, context, onApplyPatch }: PanelProps): ReactElement {
  return (
    <div className="panel money">
      <PanelHeader title="Money">
        Where the budget goes, whether it covers the plan, and what to change if it does not.
      </PanelHeader>
      <BudgetTable plan={plan} />
      <LeverList plan={plan} onApplyPatch={onApplyPatch} />
      <CategoryControls plan={plan} context={context} onApplyPatch={onApplyPatch} />
      <CostCheck plan={plan} />
      <FunctionSlices plan={plan} />
      <GstView plan={plan} />
      <PaymentsCalendar plan={plan} />
      <SpendTracker plan={plan} />
    </div>
  );
}
