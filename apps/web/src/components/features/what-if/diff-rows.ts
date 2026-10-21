/**
 * The numbers a what-if compares, as before → after rows.
 *
 * Responsibility: pick the figures a family watches — total budget, budget per guest,
 * expected guests, plates, the estimate — and the budget lines that moved most, each with
 * its signed change, from two plans the engine built. Boundary: pure reads of the plans and
 * the engine's diff; no arithmetic beyond subtraction.
 */
import { CATEGORY_PROFILES } from '@intezaam/core/domain';
import type { Plan, PlanDiff } from '@intezaam/core/schemas';

export interface DiffRow {
  readonly key: string;
  readonly label: string;
  readonly before: number;
  readonly after: number;
  /** True for rupee amounts (shown with ₹ grouping), false for counts. */
  readonly money: boolean;
}

/** The diff shows the lines that moved most; the CSV and the Money tab have every line. */
export const MAX_CHANGED_LINES = 5;

const KEY_FIGURES: readonly {
  readonly key: string;
  readonly label: string;
  readonly money: boolean;
  readonly read: (plan: Plan) => number;
}[] = [
  { key: 'total', label: 'Total budget', money: true, read: (plan) => plan.budget.totalInr },
  {
    key: 'estimate',
    label: 'Likely cost (middle estimate)',
    money: true,
    read: (plan) => plan.verdict.estimateInr.mid,
  },
  {
    key: 'per-guest',
    label: 'Budget per guest',
    money: true,
    read: (plan) => plan.budget.perGuestInr,
  },
  {
    key: 'expected',
    label: 'Guests likely to come',
    money: false,
    read: (plan) => plan.headcount.expected,
  },
  {
    key: 'plates',
    label: 'Plates to guarantee',
    money: false,
    read: (plan) => plan.headcount.plateGuarantee,
  },
];

/**
 * Key figures that changed between two plans.
 * @example
 * keyFigureRows(before, after).map((row) => row.key); // ['expected', 'plates', 'per-guest'] after fewer guests
 */
export function keyFigureRows(before: Plan, after: Plan): DiffRow[] {
  return KEY_FIGURES.flatMap((figure) => {
    const was = figure.read(before);
    const now = figure.read(after);
    return was === now
      ? []
      : [{ key: figure.key, label: figure.label, before: was, after: now, money: figure.money }];
  });
}

/**
 * The budget lines that moved most, largest change first.
 * @example
 * changedLineRows(diff)[0]?.label; // 'Food and catering'
 */
export function changedLineRows(diff: PlanDiff): DiffRow[] {
  return [...diff.budgetChanges]
    .sort((a, b) => Math.abs(b.deltaInr) - Math.abs(a.deltaInr))
    .slice(0, MAX_CHANGED_LINES)
    .map((change) => ({
      key: change.category,
      label: CATEGORY_PROFILES[change.category].label,
      before: change.beforeInr,
      after: change.afterInr,
      money: true,
    }));
}
