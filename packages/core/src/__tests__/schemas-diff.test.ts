/**
 * Tests for schemas/diff.ts: the what-if diff and plan-fact contracts.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { LEVERS } from '../domain/levers.js';
import { planDiffSchema, planFactSchema } from '../schemas/diff.js';
import { buildFixturePlan } from './fixtures/plan-fixture.js';

const plan = buildFixturePlan();
const [risk] = plan.risks;
const [line] = plan.budget.lines;

function diffFor(deltaInr: number): unknown {
  return {
    verdictChanged: true,
    money: { before: plan.verdict.money.status, after: 'balanced' },
    time: { before: plan.verdict.time.status, after: plan.verdict.time.status },
    totalDeltaInr: deltaInr,
    budgetChanges:
      line === undefined
        ? []
        : [
            {
              category: line.category,
              beforeInr: line.amountInr,
              afterInr: line.amountInr + deltaInr,
              deltaInr,
            },
          ],
    newRisks: [],
    resolvedRisks:
      risk === undefined ? [] : [{ id: risk.id, title: risk.title, severity: risk.severity }],
    taskChanges: [
      {
        id: 'w-book-venue',
        title: 'Book the venue',
        change: 'status',
        beforeStatus: 'urgent',
        afterStatus: 'upcoming',
      },
    ],
    vendorChanges: [{ vendorType: 'dj_band', change: 'removed' }],
    cheapestFix: { leverId: 'fewer-guests', title: LEVERS['fewer-guests'].label, savingInr: 0 },
  };
}

describe('planDiffSchema', () => {
  it('accepts a diff with negative and positive deltas', () => {
    expect(planDiffSchema.safeParse(diffFor(-5000)).success).toBe(true);
    expect(planDiffSchema.safeParse(diffFor(5000)).success).toBe(true);
  });

  it('rejects an unknown task change and an unknown lever', () => {
    const diff = planDiffSchema.parse(diffFor(0));
    const badTask = { ...diff, taskChanges: [{ id: 'x', title: 'x', change: 'renamed' }] };
    expect(planDiffSchema.safeParse(badTask).success).toBe(false);
    const badFix = { ...diff, cheapestFix: { leverId: 'magic', title: 'x', savingInr: 0 } };
    expect(planDiffSchema.safeParse(badFix).success).toBe(false);
  });
});

describe('planFactSchema', () => {
  it('needs a known plan section', () => {
    expect(
      planFactSchema.safeParse({ id: 'f1', section: 'budget', text: 'Total ₹25 L' }).success,
    ).toBe(true);
    expect(planFactSchema.safeParse({ id: 'f1', section: 'gossip', text: 'x' }).success).toBe(
      false,
    );
  });
});
