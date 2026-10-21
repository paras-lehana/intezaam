/**
 * The committee's ledger (COM-03): money collected against money spent, with a balance.
 *
 * Responsibility: seed rows from the plan (each expected collection and each budget head
 * with its planned amount), add the committee's own rows, total planned and actual amounts
 * on both sides, and export the ledger as a formula-safe CSV for Google Sheets. Boundary:
 * pure; the rows live in the browser tab only.
 */
import { csvCell } from '@intezaam/core/export';
import type { CommunityPlan } from '@intezaam/core/schemas';
import { readWhole } from './chanda';

export type LedgerKind = 'collected' | 'spent';

export const LEDGER_KIND_LABELS: Readonly<Record<LedgerKind, string>> = {
  collected: 'Collected',
  spent: 'Spent',
};

export interface LedgerRow {
  readonly id: string;
  readonly label: string;
  readonly kind: LedgerKind;
  /** What the plan expects; absent for rows the committee adds. */
  readonly plannedInr?: number;
  /** What actually came in or went out, as typed. */
  readonly actual: string;
}

export interface LedgerTotals {
  readonly plannedCollectedInr: number;
  readonly plannedSpentInr: number;
  readonly collectedInr: number;
  readonly spentInr: number;
  /** Collected minus spent: positive is a surplus, negative a deficit. */
  readonly balanceInr: number;
}

const CRLF = '\r\n';

/**
 * Ledger rows seeded from the plan's expected collections and budget heads.
 * @example
 * seedLedger(plan.community)[0]; // { id: 'collect-sponsors', label: 'Sponsors', kind: 'collected', plannedInr: 60000, actual: '' }
 */
export function seedLedger(community: CommunityPlan): LedgerRow[] {
  return community.ledgerSeed.map((entry) => ({
    id: entry.id,
    label: entry.label,
    kind: entry.kind,
    plannedInr: entry.amountInr,
    actual: '',
  }));
}

/**
 * Planned and actual totals on both sides, and the balance of what actually moved.
 * @example
 * ledgerTotals([{ id: 'a', label: 'Dues', kind: 'collected', actual: '5000' }]).balanceInr; // 5000
 */
export function ledgerTotals(rows: readonly LedgerRow[]): LedgerTotals {
  let plannedCollectedInr = 0;
  let plannedSpentInr = 0;
  let collectedInr = 0;
  let spentInr = 0;
  for (const row of rows) {
    const planned = row.plannedInr ?? 0;
    const actual = readWhole(row.actual) ?? 0;
    if (row.kind === 'collected') {
      plannedCollectedInr += planned;
      collectedInr += actual;
    } else {
      plannedSpentInr += planned;
      spentInr += actual;
    }
  }
  return {
    plannedCollectedInr,
    plannedSpentInr,
    collectedInr,
    spentInr,
    balanceInr: collectedInr - spentInr,
  };
}

/**
 * The ledger in CSV; labels pass core's formula guard (the committee types them).
 * @example
 * ledgerToCsv([{ id: 'x', label: '=SUM(A1)', kind: 'spent', actual: '100' }]).split('\r\n')[1];
 * // "'=SUM(A1),Spent,,100"
 */
export function ledgerToCsv(rows: readonly LedgerRow[]): string {
  const header = ['Item', 'Collected or spent', 'Planned (INR)', 'Actual (INR)'];
  const body = rows.map((row) => [
    row.label,
    LEDGER_KIND_LABELS[row.kind],
    row.plannedInr,
    readWhole(row.actual),
  ]);
  return [header, ...body].map((cells) => cells.map(csvCell).join(',')).join(CRLF) + CRLF;
}
