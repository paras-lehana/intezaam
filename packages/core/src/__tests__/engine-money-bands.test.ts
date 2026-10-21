/**
 * Tests for engine/money-bands.ts — the wedding money bands (09 Gap 2 §2.4).
 *
 * Responsibility: guard the stored velvetknot rows against drift (mid rows equal the domain
 * anchors), prove the generic row scales by the tier multiplier, the stretch floor uses an
 * integer cross-multiply (equality is not stretch), the bands are contiguous (a per-guest
 * sweep always lands in exactly one band, in order) and the "close to" note fires within
 * 7% of a boundary. Boundary: unit tests over the band functions.
 */
import { describe, expect, it } from 'vitest';
import { ANCHOR_CITIES, CITY_ANCHORS } from '../domain/cities.js';
import { CATERING_STRETCH_SHARE } from '../domain/costs.js';
import {
  BAND_BASIS_GUESTS,
  billableGuests,
  classifyWeddingSpend,
  eventSpendShareBp,
  MIN_BILLABLE_GUESTS,
  NEAR_BOUNDARY_PCT,
  VERDICT_TIER_MULTIPLIER,
  VK_CITY_ROWS_300,
  VK_GENERIC_ROW_300,
  weddingRow,
} from '../engine/money-bands.js';
import { computeShares } from '../engine/budget-shares.js';
import { MONEY_STATUSES } from '../schemas/plan-money.js';
import { classified, wedding } from './fixtures/engine-contexts.js';

const row = VK_CITY_ROWS_300.jaipur;
const billable = BAND_BASIS_GUESTS;

describe('stored rows', () => {
  it('keep every city mid row equal to the domain anchor (source-drift guard)', () => {
    for (const city of ANCHOR_CITIES) {
      expect(VK_CITY_ROWS_300[city].mid).toEqual(CITY_ANCHORS[city].midRangeInr);
    }
    expect(BAND_BASIS_GUESTS).toBe(CITY_ANCHORS.jaipur.referenceGuests);
  });

  it('scale the generic row by the tier multiplier for cities without a row', () => {
    const pune = weddingRow(classified(wedding({ city: 'Pune' })));
    expect(pune.anchored).toBe(false);
    expect(pune.row.mid.min).toBe(
      Math.round(VK_GENERIC_ROW_300.mid.min * VERDICT_TIER_MULTIPLIER.tier2),
    );
    expect(weddingRow(classified(wedding())).place).toBe(CITY_ANCHORS.jaipur.label);
  });
});

describe('billableGuests and eventSpendShareBp', () => {
  it('never bills fewer than the floor', () => {
    expect(billableGuests(1)).toBe(MIN_BILLABLE_GUESTS);
    expect(billableGuests(MIN_BILLABLE_GUESTS + 1)).toBe(MIN_BILLABLE_GUESTS + 1);
  });

  it('excludes jewellery, outfits and rooms from event spend', () => {
    const { shares } = computeShares(classified(wedding()));
    expect(eventSpendShareBp(shares)).toBe(
      10_000 - shares.attire - shares.accommodation - shares.jewellery,
    );
  });
});

describe('classifyWeddingSpend', () => {
  it('calls stretch only when the floor exceeds 60% of event spend (equality is not stretch)', () => {
    const eventSpendInr = 1_000_000;
    const atCap = Math.round(eventSpendInr * CATERING_STRETCH_SHARE);
    expect(classifyWeddingSpend({ eventSpendInr, billable, floorInr: atCap }, row).band).not.toBe(
      'stretch',
    );
    expect(classifyWeddingSpend({ eventSpendInr, billable, floorInr: atCap + 1 }, row).band).toBe(
      'stretch',
    );
  });

  it('lands every per-guest amount in exactly one band, in rising order', () => {
    let previous = 0;
    for (let perGuest = 0; perGuest <= 60_000; perGuest += 250) {
      const { band } = classifyWeddingSpend(
        { eventSpendInr: perGuest * billable, billable, floorInr: 0 },
        row,
      );
      const index = MONEY_STATUSES.indexOf(band);
      expect(index).toBeGreaterThanOrEqual(previous);
      previous = index;
    }
    expect(MONEY_STATUSES[previous]).toBe('premium');
  });

  it('switches band exactly at each published minimum', () => {
    const at = (amount: number): string =>
      classifyWeddingSpend({ eventSpendInr: amount, billable, floorInr: 0 }, row).band;
    expect([at(row.budget.min - 1), at(row.budget.min)]).toEqual(['home-style', 'lean']);
    expect([at(row.mid.min - 1), at(row.mid.min)]).toEqual(['lean', 'balanced']);
    expect([at(row.luxury.min - 1), at(row.luxury.min)]).toEqual(['balanced', 'premium']);
  });

  it('notes the band on the other side within 7% of a boundary, and nothing further away', () => {
    const near = (amount: number): string | null =>
      classifyWeddingSpend({ eventSpendInr: amount, billable, floorInr: 0 }, row).near;
    const inside = Math.round(row.mid.min * (1 - (NEAR_BOUNDARY_PCT - 1) / 100));
    const above = Math.round(row.mid.min * (1 + (NEAR_BOUNDARY_PCT - 1) / 100));
    expect(near(inside)).toBe('balanced');
    expect(near(above)).toBe('lean');
    expect(near(Math.round((row.mid.min + row.luxury.min) / 2))).toBeNull();
  });
});
