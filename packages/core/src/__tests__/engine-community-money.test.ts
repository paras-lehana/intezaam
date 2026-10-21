/**
 * Tests for engine/community-money.ts — the community estimate and food line (04 §6.4).
 *
 * Responsibility: prove a community estimate with the committee's budget IS the planned spend
 * (heads before the contingency buffer up to the whole plan), so it agrees with the funding
 * verdict; that without a budget the grade-D prasad rate per visitor is grossed up by the
 * food-and-prasad share; and that the food check reports the line per visitor and is never
 * "short". Boundary: expectations come from the split tables and the engine's own helpers.
 */
import { describe, expect, it } from 'vitest';
import { BASIS_POINTS_TOTAL, baseSplitFor } from '../domain/budget-splits.js';
import { computeShares } from '../engine/budget-shares.js';
import {
  communityEstimate,
  communityFoodCheck,
  PRASAD_PER_VISITOR_INR,
} from '../engine/community-money.js';
import { createTraceLog } from '../engine/trace.js';
import { costCheckSchema } from '../schemas/plan-money.js';
import {
  classified,
  community,
  normalised,
  planOf,
  withoutBudget,
} from './fixtures/engine-contexts.js';

describe('communityEstimate', () => {
  it('is the committee’s planned spend, from the heads before the buffer up to the whole', () => {
    const ctx = classified(community());
    const planned = community().budgetInr ?? 0;
    const buffer = Math.round(
      (planned * computeShares(ctx).shares.contingency) / BASIS_POINTS_TOTAL,
    );
    expect(communityEstimate(ctx)).toEqual({
      low: planned - buffer,
      mid: planned,
      high: planned,
    });
  });

  it('agrees with the funding verdict in the built plan', () => {
    const plan = planOf(community());
    expect(plan.verdict.estimateInr.high).toBe(plan.budget.totalInr);
    expect(plan.verdict.funding?.status).toBe('funded');
    expect(plan.verdict.money.status).toBe('balanced');
  });

  it('grosses the assumed prasad rate up by the food share when no budget is given', () => {
    const ctx = classified(withoutBudget(community()));
    const foodBp = baseSplitFor(ctx.kind).shares.catering ?? BASIS_POINTS_TOTAL;
    const gross = (perVisitor: number): number =>
      Math.round((ctx.footfall * perVisitor * BASIS_POINTS_TOTAL) / foodBp);
    const low = gross(PRASAD_PER_VISITOR_INR.min);
    const high = gross(PRASAD_PER_VISITOR_INR.max);
    expect(communityEstimate(ctx)).toEqual({ low, mid: Math.round((low + high) / 2), high });
  });
});

describe('communityFoodCheck (CST-01)', () => {
  it('reports the food-and-prasad line per visitor and is never short', () => {
    const ctx = normalised(community());
    const line = 87_500;
    const trace = createTraceLog();
    const check = communityFoodCheck(ctx, line, trace);
    expect(costCheckSchema.safeParse(check).success).toBe(true);
    const perVisitor = Math.round(line / ctx.footfall);
    expect(check.perPlateInr).toEqual({ min: perVisitor, max: perVisitor });
    expect([check.status, check.gapInr, check.plates]).toEqual(['covered', 0, ctx.footfall]);
    expect(check.cateringInr).toEqual({ low: line, mid: line, high: line });
    const item = trace.items()[0];
    expect([item?.ruleId, item?.assumption]).toEqual(['CST-01', true]);
  });

  it('says the committee’s line is an editable assumption, and names the assumed rate without one', () => {
    const own = communityFoodCheck(normalised(community()), 87_500, createTraceLog());
    expect(own.notes.join(' ')).toContain('an assumption the committee can change');
    // Indian digit grouping, the same as every rupee figure beside it.
    const visitors = normalised(community()).footfall.toLocaleString('en-IN');
    expect(own.notes.join(' ')).toContain(`each of ${visitors} visitors`);
    const estimated = communityFoodCheck(
      normalised(withoutBudget(community())),
      50_000,
      createTraceLog(),
    );
    expect(estimated.notes.join(' ')).toContain('enter the committee');
  });
});
