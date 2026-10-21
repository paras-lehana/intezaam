/**
 * Responsibility: the numbers a what-if compares — only figures that changed, read straight
 * from the two plans, and the budget lines that moved most, largest first and capped.
 * Boundary: both plans come from the engine; nothing here is hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { CATEGORY_PROFILES } from '@intezaam/core/domain';
import { diffPlans } from '@intezaam/core/engine';
import {
  MAX_CHANGED_LINES,
  changedLineRows,
  keyFigureRows,
} from '../../../components/features/what-if/diff-rows';
import { simulatePatch } from '../../../components/features/what-if/simulate';
import { TEST_TODAY_ISO } from '../../helpers';
import { samplePanel } from '../panel-fixtures';

function fewerGuests(): ReturnType<typeof samplePanel> & {
  after: ReturnType<typeof samplePanel>['plan'];
} {
  const setup = samplePanel('jaipur-wedding');
  const result = simulatePatch(
    setup.context,
    setup.plan,
    { ops: [{ op: 'setGuests', value: setup.context.guests - 100 }] },
    TEST_TODAY_ISO,
  );
  if (!result.ok) throw new Error(result.error);
  return { ...setup, after: result.value.after };
}

describe('keyFigureRows', () => {
  it('lists only figures that changed, with the plans’ own values', () => {
    const { plan, after } = fewerGuests();
    const rows = keyFigureRows(plan, after);
    expect(rows.map((row) => row.key)).toContain('expected');
    const expected = rows.find((row) => row.key === 'expected');
    expect(expected).toMatchObject({
      before: plan.headcount.expected,
      after: after.headcount.expected,
      money: false,
    });
    for (const row of rows) expect(row.after).not.toBe(row.before);
  });

  it('is empty when nothing changed', () => {
    const { plan } = samplePanel('bengaluru-birthday');
    expect(keyFigureRows(plan, plan)).toEqual([]);
  });
});

describe('changedLineRows', () => {
  it('puts the biggest moves first, labelled with core’s category names', () => {
    const { plan, after } = fewerGuests();
    const diff = diffPlans(plan, after);
    const rows = changedLineRows(diff);
    expect(rows.length).toBeLessThanOrEqual(MAX_CHANGED_LINES);
    const sizes = rows.map((row) => Math.abs(row.after - row.before));
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
    for (const row of rows) {
      const change = diff.budgetChanges.find((entry) => entry.category === row.key);
      expect(change).toBeDefined();
      if (change !== undefined) expect(row.label).toBe(CATEGORY_PROFILES[change.category].label);
    }
  });
});
