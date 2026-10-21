/**
 * Responsibility: the committee ledger (COM-03) — rows seeded from the plan's expected
 * collections and budget heads, totals and balance of what actually moved, and a CSV with
 * the formula guard. Boundary: pure functions over rows; the table is tested with the panel.
 */
import { describe, expect, it } from 'vitest';
import {
  type LedgerRow,
  ledgerToCsv,
  ledgerTotals,
  seedLedger,
} from '../../../components/features/people/ledger';
import { samplePanel } from '../panel-fixtures';

describe('ledger', () => {
  it('seeds one row per expected collection and budget head, with planned amounts', () => {
    const community = samplePanel('society-ganesh').plan.community;
    if (community === undefined) throw new Error('the society sample has a community plan');
    const rows = seedLedger(community);
    expect(rows.map((row) => row.id)).toEqual(community.ledgerSeed.map((entry) => entry.id));
    expect(rows.every((row) => row.actual === '')).toBe(true);
    const totals = ledgerTotals(rows);
    const planned = (kind: 'collected' | 'spent'): number =>
      community.ledgerSeed
        .filter((entry) => entry.kind === kind)
        .reduce((sum, entry) => sum + entry.amountInr, 0);
    expect(totals.plannedCollectedInr).toBe(planned('collected'));
    expect(totals.plannedSpentInr).toBe(planned('spent'));
    expect(totals.balanceInr).toBe(0);
  });

  it('balances actual collections against actual spending', () => {
    const rows: LedgerRow[] = [
      { id: 'a', label: 'Flat 12B', kind: 'collected', actual: '₹1,000' },
      { id: 'b', label: 'Flowers', kind: 'spent', actual: '1500' },
      { id: 'c', label: 'Not paid yet', kind: 'spent', actual: '' },
    ];
    expect(ledgerTotals(rows)).toMatchObject({
      collectedInr: 1000,
      spentInr: 1500,
      balanceInr: -500,
    });
  });

  it('exports a formula-safe CSV', () => {
    const csv = ledgerToCsv([
      { id: 'x', label: '=SUM(A1:A9)', kind: 'spent', plannedInr: 200, actual: '150' },
    ]);
    expect(csv.split('\r\n')[1]).toBe("'=SUM(A1:A9),Spent,200,150");
  });
});
