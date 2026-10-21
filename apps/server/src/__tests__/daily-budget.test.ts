/**
 * Tests for services/daily-budget.ts: per-model daily counts that reset at midnight Pacific.
 *
 * Responsibility: pin the quota-day boundary and the spend/available contract.
 * Boundary: fake clock only.
 */
import { describe, expect, it } from 'vitest';
import { createDailyBudget, quotaDay, unlimitedBudget } from '../services/daily-budget.js';
import { createFakeClock } from './helpers.js';

const MINUTE_MS = 60_000;

describe('quotaDay', () => {
  it('uses the Los Angeles calendar day, not UTC', () => {
    // 06:59 UTC on 21 Oct is 23:59 on 20 Oct in Los Angeles (PDT, UTC-7).
    expect(quotaDay(Date.UTC(2026, 9, 21, 6, 59))).toBe('2026-10-20');
    expect(quotaDay(Date.UTC(2026, 9, 21, 7, 0))).toBe('2026-10-21');
  });
});

describe('createDailyBudget', () => {
  it('spends a model down to its limit, leaves other models alone and never limits unknown ones', () => {
    const clock = createFakeClock(Date.UTC(2026, 9, 21, 6, 0));
    const budget = createDailyBudget({
      limits: new Map([
        ['a', 2],
        ['b', 1],
      ]),
      now: clock.now,
    });
    budget.spend('a');
    expect(budget.available('a')).toBe(true);
    budget.spend('a');
    expect(budget.available('a')).toBe(false);
    expect(budget.available('b')).toBe(true);
    budget.spend('unknown');
    expect(budget.available('unknown')).toBe(true);
  });

  it('resets every count when the Pacific day turns over', () => {
    const clock = createFakeClock(Date.UTC(2026, 9, 21, 6, 58));
    const budget = createDailyBudget({ limits: new Map([['a', 1]]), now: clock.now });
    budget.spend('a');
    expect(budget.available('a')).toBe(false);
    clock.advance(MINUTE_MS);
    expect(budget.available('a')).toBe(false);
    clock.advance(MINUTE_MS);
    expect(budget.available('a')).toBe(true);
  });

  it('offers an unlimited budget for clients without a cap', () => {
    const budget = unlimitedBudget();
    budget.spend('a');
    expect(budget.available('a')).toBe(true);
  });
});
