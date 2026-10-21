/**
 * Tests for engine/budget.ts — budget lines, per-function slices and the GST view.
 *
 * Responsibility: prove lines always add up to the total in exact rupees (BUD-09) for many
 * totals, per-guest figures appear only on lines that scale with guests, every line's
 * function slices add up to the line, the GST inside a line is amount × rate ÷ (100 +
 * rate), and every line cites the steps that moved it. Boundary: unit tests.
 */
import { describe, expect, it } from 'vitest';
import { CATEGORY_PROFILES } from '../domain/budget-categories.js';
import { buildBudget, sharePercent } from '../engine/budget.js';
import { computeShares } from '../engine/budget-shares.js';
import { createTraceLog } from '../engine/trace.js';
import { budgetSchema, gstSummarySchema } from '../schemas/plan-money.js';
import type { EventContext } from '../schemas/context.js';
import { birthday, community, normalised, wedding } from './fixtures/engine-contexts.js';

function build(context: EventContext): ReturnType<typeof buildBudget> & { ids: string[] } {
  const ctx = normalised(context);
  const trace = createTraceLog();
  const result = buildBudget(ctx, computeShares(ctx), trace);
  return { ...result, ids: trace.items().map((item) => item.id) };
}

describe('buildBudget', () => {
  it('adds up to the total exactly for awkward totals', () => {
    for (const budgetInr of [1, 9_999, 1_234_567, 2_500_003, 99_999_999]) {
      const { budget } = build(wedding({ budgetInr }));
      expect(budget.lines.reduce((sum, line) => sum + line.amountInr, 0)).toBe(budgetInr);
      expect(budget.totalInr).toBe(budgetInr);
    }
  });

  it('is schema-valid and gives per-guest figures only to lines that scale with guests', () => {
    const { budget, gst } = build(wedding());
    expect(budgetSchema.safeParse(budget).success).toBe(true);
    expect(gstSummarySchema.safeParse(gst).success).toBe(true);
    for (const line of budget.lines) {
      const fixed = CATEGORY_PROFILES[line.category].costType === 'fixed';
      expect(line.perGuestInr === undefined).toBe(fixed);
    }
    expect(budget.contingencyInr).toBe(
      budget.lines.find((line) => line.category === 'contingency')?.amountInr,
    );
    expect(budget.jewelleryInr).toBe(0);
  });

  it('marks the user’s priorities and cites the steps behind each line', () => {
    const { budget, ids } = build(wedding());
    const catering = budget.lines.find((line) => line.category === 'catering');
    expect(catering?.priority).toBe(true);
    expect(catering?.traceIds.some((id) => id.startsWith('BUD-05'))).toBe(true);
    budget.lines.forEach((line) => line.traceIds.forEach((id) => expect(ids).toContain(id)));
  });

  it('slices every line across the functions so the slices add up to the line', () => {
    for (const context of [wedding(), community(), birthday()]) {
      const { budget } = build(context);
      for (const line of budget.lines) {
        const sliced = budget.byFunction.reduce(
          (sum, fn) =>
            sum + (fn.lines.find((part) => part.category === line.category)?.amountInr ?? 0),
          0,
        );
        expect(sliced).toBe(line.amountInr);
      }
      const functionsTotal = budget.byFunction.reduce((sum, fn) => sum + fn.amountInr, 0);
      expect(functionsTotal).toBe(budget.totalInr);
    }
  });

  it('shows the GST inside each line once, and none where no rate is researched', () => {
    const { budget, gst } = build(wedding());
    for (const line of gst.lines) {
      const amount = budget.lines.find((entry) => entry.category === line.category)?.amountInr ?? 0;
      const expected =
        line.ratePct === null ? 0 : Math.round((amount * line.ratePct) / (100 + line.ratePct));
      expect(line.gstInr).toBe(expected);
    }
    expect(gst.totalInr).toBe(gst.lines.reduce((sum, line) => sum + line.gstInr, 0));
  });

  it('labels functions with the tradition’s local names', () => {
    const { budget } = build(wedding({ tradition: 'muslim', functions: [] }));
    expect(budget.byFunction.map((fn) => fn.label)).toContain('Nikah');
  });
});

describe('sharePercent', () => {
  it('formats basis points as a percentage', () => {
    expect(sharePercent(2_500)).toBe('25%');
    expect(sharePercent(1_727)).toBe('17.27%');
  });
});
