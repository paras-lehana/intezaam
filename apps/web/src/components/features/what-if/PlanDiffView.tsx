/**
 * What a change does to the plan: verdict, numbers, risks, tasks and the cheapest fix.
 *
 * Responsibility: the what-if diff shared by What if and Ask — the money and time verdicts
 * (and funding) before → after, the key figures and budget lines that moved, risks that
 * appear or clear (severity in words), timeline tasks added or removed, and the new plan's
 * cheapest lever. Boundary: display only; `diffPlans` and the two plans come from core.
 */
import type { ReactElement } from 'react';
import { FUNDING_LABELS, MONEY_LABELS, TIME_LABELS } from '@intezaam/core/engine';
import type { Plan, PlanDiff } from '@intezaam/core/schemas';
import { MoneyCell } from '../common/MoneyCell';
import { changedLineRows, keyFigureRows } from './diff-rows';
import { DiffNumbers } from './DiffNumbers';
import { DiffRisks } from './DiffRisks';

export interface PlanDiffViewProps {
  readonly before: Plan;
  readonly after: Plan;
  readonly diff: PlanDiff;
}

export function PlanDiffView({ before, after, diff }: PlanDiffViewProps): ReactElement {
  const added = diff.taskChanges.filter((task) => task.change === 'added').length;
  const removed = diff.taskChanges.filter((task) => task.change === 'removed').length;
  const moved = diff.taskChanges.length - added - removed;
  const funding = diff.funding;
  return (
    <div className="diff panel-flat">
      <p className="diff__verdict">
        <strong>{diff.verdictChanged ? 'The verdict changes:' : 'The verdict stays:'}</strong>{' '}
        {MONEY_LABELS[diff.money.before]} → {MONEY_LABELS[diff.money.after]} budget ·{' '}
        {TIME_LABELS[diff.time.before]} → {TIME_LABELS[diff.time.after]} timeline
        {funding?.before === undefined || funding.after === undefined
          ? null
          : ` · ${FUNDING_LABELS[funding.before]} → ${FUNDING_LABELS[funding.after]}`}
      </p>
      <DiffNumbers caption="Key figures" rows={keyFigureRows(before, after)} />
      <DiffNumbers caption="Budget lines that move most" rows={changedLineRows(diff)} />
      <DiffRisks title="New risks" risks={diff.newRisks} />
      <DiffRisks title="Risks cleared" risks={diff.resolvedRisks} />
      {diff.taskChanges.length === 0 ? null : (
        <p>
          Timeline: {added} tasks added, {removed} removed, {moved} re-dated or re-prioritised.
        </p>
      )}
      {diff.cheapestFix === undefined ? null : (
        <p>
          <strong>Cheapest fix in the new plan:</strong> {diff.cheapestFix.title} — saves{' '}
          <MoneyCell amount={diff.cheapestFix.savingInr} />.
        </p>
      )}
    </div>
  );
}
