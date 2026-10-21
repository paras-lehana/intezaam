/**
 * Tests for engine/lever-candidates.ts — the money levers LEV-01…05 and their helpers.
 *
 * Responsibility: prove each candidate applies exactly when it can help (fewer guests by the
 * guest target, a weekday on a peak weekend, a cheaper caterer class, dropping the second
 * biggest non-wedding function, the hometown for a destination wedding), prices its saving
 * from the plan or the same engine re-run, and sends a patch the what-if engine accepts.
 * Boundary: expectations are read from the engine's own core and helpers.
 */
import { describe, expect, it } from 'vitest';
import { OFF_PEAK_PRICE_FACTOR } from '../domain/seasons.js';
import type { LeverId } from '../domain/levers.js';
import { cateringRange } from '../engine/catering.js';
import {
  type LeverDraft,
  lineOf,
  MONEY_CANDIDATES,
  rerun,
  withBudget,
} from '../engine/lever-candidates.js';
import { nextDiscountWeekday } from '../engine/lever-helpers.js';
import { guestTarget } from '../engine/lever-targets.js';
import type { EventContext } from '../schemas/context.js';
import {
  birthday,
  clean,
  community,
  coreOf,
  TODAY,
  undated,
  wedding,
} from './fixtures/engine-contexts.js';

function draft(context: EventContext, id: LeverId): LeverDraft | undefined {
  const input = { context: clean(context), core: coreOf(context), todayIso: TODAY };
  return (
    MONEY_CANDIDATES.map((candidate) => candidate(input)).find((d) => d?.id === id) ?? undefined
  );
}

describe('helpers', () => {
  it('reads a budget line, 0 when absent, and sets a whole-rupee budget of at least ₹1', () => {
    const core = coreOf(wedding());
    expect(lineOf(core, 'decor')).toBe(
      core.budget.lines.find((line) => line.category === 'decor')?.amountInr,
    );
    expect(lineOf(core, 'cultural_prizes')).toBe(0);
    expect(withBudget(wedding(), 1_234.6).budgetInr).toBe(1_235);
    expect(withBudget(wedding(), -5).budgetInr).toBe(1);
  });

  it('re-runs the money core on a changed context', () => {
    expect(rerun(clean(wedding()), TODAY).money).toEqual(coreOf(wedding()).money);
  });
});

describe('fewer guests (LEV-01)', () => {
  it('invites the guest target and saves what falls with guests', () => {
    const lever = draft(wedding(), 'fewer-guests');
    const target = guestTarget(coreOf(wedding()));
    expect(lever?.patch).toEqual({ ops: [{ op: 'setGuests', value: target }] });
    expect(lever?.judge.guests).toBe(target);
    expect(lever?.savingInr).toBeGreaterThan(0);
  });

  it('is not offered for parties, committees or when nothing is short', () => {
    expect(draft(birthday({ budgetInr: 1_000 }), 'fewer-guests')).toBeUndefined();
    expect(draft(community(), 'fewer-guests')).toBeUndefined();
    expect(draft(wedding({ budgetInr: 200_000_000 }), 'fewer-guests')).toBeUndefined();
  });
});

describe('off-peak date (LEV-02)', () => {
  it('moves a peak weekend to the next weekday and saves 15% of venue, catering and decor', () => {
    const core = coreOf(wedding());
    const lever = draft(wedding(), 'off-peak-date');
    const lines = lineOf(core, 'venue') + lineOf(core, 'catering') + lineOf(core, 'decor');
    expect(lever?.savingInr).toBe(Math.round(lines * (1 - OFF_PEAK_PRICE_FACTOR)));
    const weekday = nextDiscountWeekday(core.ctx.dateIso ?? '');
    expect(lever?.patch).toEqual({ ops: [{ op: 'setDate', value: weekday }] });
    expect(lever?.judge.budgetInr).toBe(core.ctx.budgetInr + (lever?.savingInr ?? 0));
  });

  it('is not offered off-peak, on a weekday or without a date', () => {
    expect(draft(birthday(), 'off-peak-date')).toBeUndefined();
    expect(draft(wedding({ dateIso: '2027-02-22' }), 'off-peak-date')).toBeUndefined();
    expect(draft(undated(wedding()), 'off-peak-date')).toBeUndefined();
  });
});

describe('simpler catering (LEV-03)', () => {
  it('steps a standard caterer down to a community caterer', () => {
    const core = coreOf(wedding());
    const lever = draft(wedding(), 'simpler-catering');
    expect(lever?.title).toBe('Choose a community caterer or halwai');
    expect(lever?.savingInr).toBe(
      core.costCheck.cateringInr.mid - cateringRange(core.ctx, 'community').mid,
    );
  });

  it('steps a premium caterer down to a standard one', () => {
    const lever = draft(wedding({ budgetInr: 200_000_000 }), 'simpler-catering');
    expect(lever?.title).toBe('Choose a standard multi-cuisine caterer');
  });

  it('is not offered at a community caterer or for a committee', () => {
    expect(draft(wedding({ city: 'Delhi', budgetInr: 300_000 }), 'simpler-catering')).toBe(
      undefined,
    );
    expect(draft(community(), 'simpler-catering')).toBeUndefined();
  });
});

describe('drop a function (LEV-04)', () => {
  it('drops the second biggest function, never the wedding itself', () => {
    const core = coreOf(wedding());
    const slices = [...core.budget.byFunction].sort((a, b) => b.amountInr - a.amountInr);
    const expected = slices.slice(1).find((slice) => slice.functionKind !== 'wedding');
    const lever = draft(wedding(), 'drop-function');
    expect(lever?.patch).toEqual({
      ops: [{ op: 'removeFunction', value: expected?.functionKind }],
    });
    expect(lever?.savingInr).toBe(expected?.amountInr);
    expect(lever?.judge.budgetInr).toBe(core.ctx.budgetInr + (expected?.amountInr ?? 0));
  });

  it('judges a bottom-up plan on the smaller plan itself, and needs two functions', () => {
    const milestone = birthday({
      kind: 'milestone-birthday',
      functions: ['party', 'puja'],
      birthday: { age: 40 },
    });
    const lever = draft(milestone, 'drop-function');
    expect(lever?.judge.budgetInr).toBe(milestone.budgetInr);
    expect(draft(birthday(), 'drop-function')).toBeUndefined();
  });
});

describe('hometown (LEV-05)', () => {
  it('prices a destination wedding’s rooms at home rates', () => {
    const away = wedding({ destination: true });
    const lever = draft(away, 'hometown');
    const saving =
      coreOf(away).costCheck.roomsInr - coreOf({ ...away, destination: false }).costCheck.roomsInr;
    expect(lever?.savingInr).toBe(saving);
    expect(lever?.judge.destination).toBe(false);
  });

  it('is not offered at home or when no rooms are needed', () => {
    expect(draft(wedding(), 'hometown')).toBeUndefined();
    expect(draft(wedding({ destination: true, outstationShare: 0 }), 'hometown')).toBe(undefined);
  });
});
