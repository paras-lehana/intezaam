/**
 * Tests for domain/costs.ts: that derived cost cells follow the metro row and tier multipliers.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { CITY_TIERS, TIER_PROFILES } from '../domain/cities.js';
import {
  BIRTHDAY_BANDS,
  KIDS_PARTY_ITEMS_INR,
  WEDDING_BANDS,
  WEDDING_COST_MATRIX,
  WEDDING_MATRIX_REFERENCE_GUESTS,
} from '../domain/costs.js';
import { SCALE_BANDS } from '../domain/scale.js';
import { lakh } from '../domain/units.js';

/**
 * Derived rows are the metro row × the tier multiplier, rounded to the nearest half lakh
 * (or to two significant figures above ₹1 crore, as 04 §1.3 prints "₹1.2 Cr").
 */
const HALF_LAKH_INR = lakh(0.5);
const SIGNIFICANT_FIGURE_SHARE = 0.01;

function tolerance(derived: number): number {
  return Math.max(HALF_LAKH_INR, derived * SIGNIFICANT_FIGURE_SHARE);
}

describe('wedding cost matrix (04 §1.3)', () => {
  it('every cell is an ordered range and bands rise budget → mid → luxury', () => {
    for (const tier of CITY_TIERS) {
      for (const scale of SCALE_BANDS) {
        const row = WEDDING_COST_MATRIX[tier][scale];
        for (const band of WEDDING_BANDS) expect(row[band].min).toBeLessThan(row[band].max);
        expect(row.budget.min).toBeLessThan(row.mid.min);
        expect(row.mid.min).toBeLessThan(row.luxury.min);
      }
    }
  });

  it('tier-2 and tier-3 rows are the metro row times the tier multiplier', () => {
    for (const tier of CITY_TIERS) {
      const multiplier = TIER_PROFILES[tier].costMultiplier;
      for (const scale of SCALE_BANDS) {
        for (const band of WEDDING_BANDS) {
          const metro = WEDDING_COST_MATRIX.metro[scale][band];
          const cell = WEDDING_COST_MATRIX[tier][scale][band];
          for (const end of ['min', 'max'] as const) {
            const derived = metro[end] * multiplier;
            expect(Math.abs(cell[end] - derived)).toBeLessThanOrEqual(tolerance(derived));
          }
        }
      }
    }
  });

  it('reference guests grow with the scale band', () => {
    const guests = SCALE_BANDS.map((scale) => WEDDING_MATRIX_REFERENCE_GUESTS[scale]);
    expect(guests).toEqual([...guests].sort((a, b) => a - b));
  });
});

describe('birthday bands (04 §5.2)', () => {
  it('ranges are ordered and an open top band has no maximum', () => {
    for (const bands of Object.values(BIRTHDAY_BANDS)) {
      for (const band of bands) {
        expect(band.guests.min).toBeLessThanOrEqual(band.guests.max);
        if (band.inr.max !== null) expect(band.inr.min).toBeLessThan(band.inr.max);
      }
    }
    expect(BIRTHDAY_BANDS['kids-birthday'].at(-1)?.inr.max).toBeNull();
  });

  it("kids'-party item prices are ordered ranges", () => {
    for (const item of Object.values(KIDS_PARTY_ITEMS_INR)) expect(item.min).toBeLessThan(item.max);
    expect(KIDS_PARTY_ITEMS_INR.returnGiftStandard.max).toBeLessThan(
      KIDS_PARTY_ITEMS_INR.returnGiftPremium.min,
    );
  });
});
