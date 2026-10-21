/**
 * Tests for engine/lever-helpers.ts — the next cheaper weekday and the smaller party format.
 *
 * Responsibility: prove the weekday lever always moves later to the first Monday–Thursday,
 * keeps an unreadable date as it is, and that the party cap keeps the adults while fitting
 * the children into the next smaller published band — and offers nothing at home, for adult
 * events or when the party is already in its smallest format. Boundary: helper checks.
 */
import { describe, expect, it } from 'vitest';
import { addDaysIso, isoWeekday } from '../domain/calendar.js';
import { BIRTHDAY_BANDS } from '../domain/costs.js';
import { DISCOUNT_WEEKDAYS } from '../domain/seasons.js';
import { partyBandFor } from '../engine/estimate.js';
import { nextDiscountWeekday, partyCap } from '../engine/lever-helpers.js';
import { birthday, classified, wedding } from './fixtures/engine-contexts.js';

describe('nextDiscountWeekday', () => {
  it('moves a weekend date to the following Monday–Thursday, never earlier', () => {
    const saturday = '2027-02-20';
    expect(isoWeekday(saturday)).toBe(6);
    const moved = nextDiscountWeekday(saturday);
    expect(moved > saturday).toBe(true);
    expect(DISCOUNT_WEEKDAYS).toContain(isoWeekday(moved));
    expect(moved).toBe(addDaysIso(saturday, 2));
  });

  it('moves a weekday to the next discount day too', () => {
    const monday = '2027-02-22';
    expect(nextDiscountWeekday(monday)).toBe(addDaysIso(monday, 1));
  });

  it('keeps an unreadable date as it is', () => {
    expect(nextDiscountWeekday('not-a-date')).toBe('not-a-date');
  });
});

describe('partyCap (LEV-06)', () => {
  const outside = BIRTHDAY_BANDS['kids-birthday'].filter((band) => band.setting !== 'home');

  it('keeps the adults and fits the children into the next smaller band', () => {
    const kids = (outside[1]?.guests.max ?? 0) + 5;
    const party = birthday({ guests: kids + 10, birthday: { age: 7, kidsCount: kids } });
    const ctx = classified(party);
    const current = partyBandFor(ctx)?.band;
    const smaller = outside[outside.findIndex((band) => band === current) - 1];
    expect(partyCap(ctx)).toBe(10 + (smaller?.guests.max ?? 0));
  });

  it('offers nothing at home, for adult events, or in the smallest format', () => {
    expect(partyCap(classified(birthday({ venueSetting: 'home' })))).toBeNull();
    expect(partyCap(classified(wedding()))).toBeNull();
    const smallest = outside[0]?.guests.max ?? 0;
    expect(
      partyCap(
        classified(birthday({ guests: smallest, birthday: { age: 7, kidsCount: smallest } })),
      ),
    ).toBeNull();
  });

  it('caps a first birthday from its own bands', () => {
    const firstOutside = BIRTHDAY_BANDS['first-birthday'].filter((band) => band.setting !== 'home');
    const last = firstOutside.at(-1);
    const kids = (last?.guests.max ?? 0) + 1;
    const first = classified(
      birthday({ kind: 'first-birthday', guests: kids, birthday: { age: 1, kidsCount: kids } }),
    );
    const current = partyBandFor(first)?.band;
    const smaller = firstOutside[firstOutside.findIndex((band) => band === current) - 1];
    expect(smaller).toBeDefined();
    expect(partyCap(first)).toBe(smaller?.guests.max);
  });
});
