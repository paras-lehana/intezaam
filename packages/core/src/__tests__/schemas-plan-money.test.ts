/**
 * Tests for schemas/plan-money.ts: verdict, budget, lever and payment contracts.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { BASIS_POINTS_TOTAL } from '../domain/budget-splits.js';
import {
  budgetLineSchema,
  budgetSchema,
  leverSchema,
  paymentsSchema,
  readinessSchema,
  verdictSchema,
} from '../schemas/plan-money.js';
import { buildFixturePlan } from './fixtures/plan-fixture.js';

const plan = buildFixturePlan();

describe('money contracts', () => {
  it('accept the fixture sections', () => {
    expect(verdictSchema.safeParse(plan.verdict).success).toBe(true);
    expect(readinessSchema.safeParse(plan.readiness).success).toBe(true);
    expect(budgetSchema.safeParse(plan.budget).success).toBe(true);
    expect(paymentsSchema.safeParse(plan.payments).success).toBe(true);
  });

  it('the fixture budget lines cover exactly 10,000 basis points', () => {
    expect(plan.budget.lines.reduce((sum, line) => sum + line.shareBp, 0)).toBe(BASIS_POINTS_TOTAL);
  });

  it('rejects a share above 100% and an unknown money status', () => {
    const [line] = plan.budget.lines;
    expect(budgetLineSchema.safeParse({ ...line, shareBp: BASIS_POINTS_TOTAL + 1 }).success).toBe(
      false,
    );
    const money = { ...plan.verdict.money, status: 'unaffordable' };
    expect(verdictSchema.safeParse({ ...plan.verdict, money }).success).toBe(false);
  });

  it('funding is optional and validated when present', () => {
    const funding = {
      status: 'gap',
      gapInr: 1000,
      surplusInr: 0,
      reason: 'Short by ₹1,000.',
      traceIds: [],
    };
    expect(verdictSchema.safeParse({ ...plan.verdict, funding }).success).toBe(true);
    expect(
      verdictSchema.safeParse({ ...plan.verdict, funding: { ...funding, status: 'broke' } })
        .success,
    ).toBe(false);
  });

  it('a lever may carry a patch, but only a valid one', () => {
    const [lever] = plan.levers;
    expect(leverSchema.safeParse(lever).success).toBe(true);
    expect(leverSchema.safeParse({ ...lever, patch: { ops: [{ op: 'explode' }] } }).success).toBe(
      false,
    );
  });
});
