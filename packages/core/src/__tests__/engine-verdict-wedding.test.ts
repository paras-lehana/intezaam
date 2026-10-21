/**
 * Tests for engine/verdict-wedding.ts — the wedding-rows money verdict (VER-M, 09 Gap 2 §2.4).
 *
 * Responsibility: prove event spend excludes jewellery, outfits and rooms; the band and the
 * caterer class follow classifyWeddingSpend (the same comparison the engine traces); the
 * trace names the anchor and every threshold; a "close to" note appears near a boundary;
 * the 60th borrows the rows at grade D and says so; and no copy says "not feasible".
 * Boundary: expectations come from money-bands.ts and the engine's own budget.
 */
import { describe, expect, it } from 'vitest';
import { buildBudget } from '../engine/budget.js';
import { computeShares } from '../engine/budget-shares.js';
import { cateringFloorInr } from '../engine/catering.js';
import { expectedGuests } from '../engine/headcount.js';
import {
  billableGuests,
  classifyWeddingSpend,
  EVENT_SPEND_EXCLUDES,
  weddingRow,
} from '../engine/money-bands.js';
import { createTraceLog } from '../engine/trace.js';
import { MONEY_LABELS } from '../engine/verdict-labels.js';
import { eventSpendInr, weddingMoney } from '../engine/verdict-wedding.js';
import type { EventContext } from '../schemas/context.js';
import { normalised, sample, wedding } from './fixtures/engine-contexts.js';

function judge(context: EventContext): {
  verdict: ReturnType<typeof weddingMoney>;
  expectedBand: ReturnType<typeof classifyWeddingSpend>;
  trace: ReturnType<typeof createTraceLog>;
} {
  const ctx = normalised(context);
  const trace = createTraceLog();
  const { budget } = buildBudget(ctx, computeShares(ctx), trace);
  const expectedBand = classifyWeddingSpend(
    {
      eventSpendInr: eventSpendInr(budget.lines),
      billable: billableGuests(expectedGuests(ctx)),
      floorInr: cateringFloorInr(ctx),
    },
    weddingRow(ctx).row,
  );
  return { verdict: weddingMoney(ctx, budget.lines, trace), expectedBand, trace };
}

describe('eventSpendInr', () => {
  it('sums every line except jewellery, outfits and guest rooms', () => {
    const ctx = normalised(wedding({ toggles: { jewellery: true, planner: false } }));
    const { budget } = buildBudget(ctx, computeShares(ctx), createTraceLog());
    const kept = budget.lines.filter((line) => !EVENT_SPEND_EXCLUDES.includes(line.category));
    expect(eventSpendInr(budget.lines)).toBe(kept.reduce((sum, line) => sum + line.amountInr, 0));
    expect(eventSpendInr(budget.lines)).toBeLessThan(budget.totalInr);
  });
});

describe('weddingMoney', () => {
  const budgets = [300_000, 1_000_000, 2_500_000, 6_000_000, 200_000_000];

  it.each(budgets)('₹%i: band and caterer class follow the traced comparison', (budgetInr) => {
    const { verdict, expectedBand } = judge(wedding({ city: 'Delhi', budgetInr }));
    expect(verdict.status).toBe(expectedBand.band);
    const classes = { stretch: 'community', 'home-style': 'community', premium: 'premium' };
    const level = Object.entries(classes).find(([band]) => band === verdict.status)?.[1];
    expect(verdict.level).toBe(level ?? 'standard');
    expect(verdict.reason).not.toMatch(/not feasible|impossible/i);
  });

  it('traces the anchor and every threshold, citing grade-C rows for a wedding', () => {
    const { verdict, trace } = judge(wedding());
    const item = trace.items().find((entry) => entry.id === verdict.traceIds[0]);
    const keys = item?.inputs.map((input) => input.key) ?? [];
    expect(keys).toEqual(
      expect.arrayContaining(['compared with', 'lean from', 'balanced from', 'premium from']),
    );
    expect(item?.inputs.find((input) => input.key === 'compared with')?.value).toBe('Jaipur row');
    expect(item?.confidence).toBe('C');
  });

  it('adds a "close to" note near a boundary', () => {
    const near = budgetsNear();
    expect(near).not.toBeNull();
    if (near === null) return;
    const { verdict, expectedBand } = judge(wedding({ budgetInr: near }));
    expect(verdict.reason).toContain(`Close to ${MONEY_LABELS[expectedBand.near ?? 'lean']}`);
  });

  it('compares a 60th with the city’s wedding rows at grade D, and says so', () => {
    const { verdict, trace } = judge(sample('chennai-60th'));
    expect(verdict.reason).toContain('compared with wedding rows');
    expect(verdict.reason).toContain('leave out outfits and jewellery');
    const item = trace.items().find((entry) => entry.id === verdict.traceIds[0]);
    expect([item?.confidence, item?.assumption]).toEqual(['D', true]);
    expect(item?.inputs.some((input) => input.key === 'typical mid-range')).toBe(true);
  });

  it('explains Stretch with the share food would take', () => {
    const { verdict } = judge(wedding({ city: 'Delhi', budgetInr: 300_000 }));
    expect(verdict.status).toBe('stretch');
    expect(verdict.reason).toMatch(/food alone would take \d+%/);
  });
});

/** The first Jaipur budget (in ₹50,000 steps) that the engine itself marks as near a boundary. */
function budgetsNear(): number | null {
  for (let budgetInr = 1_000_000; budgetInr <= 6_000_000; budgetInr += 50_000) {
    if (judge(wedding({ budgetInr })).expectedBand.near !== null) return budgetInr;
  }
  return null;
}
