/**
 * Tests for engine/verdict-money.ts — the money axis (VER-M) for every event family.
 *
 * Responsibility: prove the range comparison boundaries, that each money model picks its own
 * judge (wedding rows, party bands, bottom-up, committee funding), home-style on the wire,
 * and that no copy ever says "not feasible".
 * Boundary: expectations are derived from the engine's own band and pricing functions.
 */
import { describe, expect, it } from 'vitest';
import { CATERING_STRETCH_SHARE } from '../domain/costs.js';
import { buildBudget } from '../engine/budget.js';
import { computeShares } from '../engine/budget-shares.js';
import { cateringFloorInr } from '../engine/catering.js';
import { partyBandFor } from '../engine/estimate.js';
import { computeFunding } from '../engine/funding.js';
import { createTraceLog } from '../engine/trace.js';
import type { NormalisedContext } from '../engine/types.js';
import {
  eventSpendInr,
  MONEY_LABELS,
  moneyVerdict,
  type MoneyVerdict,
  statusAgainst,
} from '../engine/verdict-money.js';
import type { EventContext } from '../schemas/context.js';
import { birthday, community, homePuja, normalised, wedding } from './fixtures/engine-contexts.js';

function judge(context: EventContext): {
  verdict: MoneyVerdict;
  ctx: NormalisedContext;
  spend: number;
} {
  const ctx = normalised(context);
  const trace = createTraceLog();
  const { budget } = buildBudget(ctx, computeShares(ctx), trace);
  const funding = computeFunding(ctx);
  const input = funding === null ? null : { funding, traceIds: ['VER-F.1'] };
  return {
    verdict: moneyVerdict(ctx, budget.lines, input, trace),
    ctx,
    spend: eventSpendInr(budget.lines),
  };
}

describe('statusAgainst', () => {
  it('reads Stretch below 60% of the minimum, then Lean, Balanced and Premium', () => {
    const [min, max] = [10_000, 20_000];
    expect(statusAgainst(5_999, min, max)).toBe('stretch');
    expect(statusAgainst(6_000, min, max)).toBe('lean');
    expect(statusAgainst(9_999, min, max)).toBe('lean');
    expect(statusAgainst(min, min, max)).toBe('balanced');
    expect(statusAgainst(max, min, max)).toBe('balanced');
    expect(statusAgainst(max + 1, min, max)).toBe('premium');
  });
});

describe('wedding money verdict', () => {
  it('reads Stretch when the food floor exceeds 60% of event spend', () => {
    const { verdict, ctx, spend } = judge(wedding({ city: 'Delhi', budgetInr: 300_000 }));
    expect(cateringFloorInr(ctx) * 100).toBeGreaterThan(CATERING_STRETCH_SHARE * 100 * spend);
    expect([verdict.status, verdict.level]).toEqual(['stretch', 'community']);
    expect(verdict.reason).toContain('Needs changes');
  });

  it('puts home-style on the wire with a local caterer below the budget row', () => {
    const { verdict } = judge(wedding({ city: 'Delhi', budgetInr: 1_000_000 }));
    expect([verdict.status, verdict.level]).toEqual(['home-style', 'community']);
    expect(verdict.reason).toContain(MONEY_LABELS['home-style']);
  });

  it('prices balanced plans at a standard caterer and premium plans at a premium one', () => {
    expect(judge(wedding()).verdict.level).toBe('standard');
    const rich = judge(wedding({ budgetInr: 200_000_000 })).verdict;
    expect([rich.status, rich.level]).toEqual(['premium', 'premium']);
  });

  it('explains the comparison in the trace with the anchor and thresholds', () => {
    const ctx = normalised(wedding({ city: 'Pune' }));
    const trace = createTraceLog();
    const { budget } = buildBudget(ctx, computeShares(ctx), trace);
    moneyVerdict(ctx, budget.lines, null, trace);
    const item = trace.items().find((entry) => entry.ruleId === 'VER-M');
    expect(item?.inputs.map((input) => input.key)).toContain('lean from');
    expect(item?.inputs.find((input) => input.key === 'compared with')?.value).toContain('scaled');
  });
});

describe('party and bottom-up verdicts', () => {
  it('compares a kids’ party with its published band', () => {
    const band = partyBandFor(normalised(birthday()));
    expect(judge(birthday()).verdict.status).toBe(
      statusAgainst(birthday().budgetInr ?? 0, band?.min ?? 0, band?.max ?? 0),
    );
    expect(judge(birthday({ budgetInr: 1_000 })).verdict.reason).toContain('Needs changes');
  });

  it('compares other events with the bottom-up estimate', () => {
    const ctx = normalised(homePuja());
    const { verdict } = judge(homePuja());
    expect(verdict.status).toBe(statusAgainst(ctx.budgetInr, ctx.estimate.low, ctx.estimate.high));
    expect(verdict.level).toBe('standard');
  });
});

describe('community money verdict', () => {
  it('reads Balanced when funded', () => {
    expect(judge(community()).verdict.status).toBe('balanced');
  });

  it('reads Lean when at least 60% is covered and Stretch below that', () => {
    const offsets = (sponsorsInr: number): EventContext => {
      const { households: _none, ...extras } = community().community ?? {
        premises: 'private',
        days: 1,
      };
      return community({ community: { ...extras, sponsorsInr, rwaFundInr: 0, ticketsInr: 0 } });
    };
    const budget = community().budgetInr ?? 0;
    expect(judge(offsets(Math.ceil(budget * 0.7))).verdict.status).toBe('lean');
    expect(judge(offsets(Math.floor(budget * 0.3))).verdict.status).toBe('stretch');
  });
});

describe('copy guard', () => {
  it('never says "not feasible", "impossible" or "can’t"', () => {
    const contexts = [
      wedding({ budgetInr: 100_000 }),
      wedding({ city: 'Delhi', budgetInr: 1_000_000 }),
      wedding(),
      birthday({ budgetInr: 500 }),
      homePuja({ budgetInr: 1_000 }),
      community({ community: { premises: 'public', days: 1 } }),
    ];
    for (const context of contexts) {
      const { reason } = judge(context).verdict;
      expect(reason).not.toMatch(/not feasible|impossible|can't|can’t/i);
    }
  });
});
