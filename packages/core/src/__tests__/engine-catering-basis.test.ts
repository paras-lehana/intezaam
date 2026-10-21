/**
 * Tests for engine/catering-basis.ts — how each kind of celebration prices its food.
 *
 * Responsibility: prove the basis is read from the one per-kind money table, the party bands
 * are the published kids' rate (teens × 1.2) and every other basis has none, and every
 * grade-D basis says "assumption" in its note. Boundary: table checks against the domain.
 */
import { describe, expect, it } from 'vitest';
import { KIDS_PARTY_ITEMS_INR, TEEN_BAND_FACTOR } from '../domain/costs.js';
import { EVENT_KINDS } from '../domain/events.js';
import {
  CATERING_BASES,
  CATERING_BASIS_INFO,
  cateringBasis,
  partyFoodBand,
} from '../engine/catering-basis.js';
import { KIND_MONEY } from '../engine/money-model.js';

describe('cateringBasis', () => {
  it('reads every kind’s basis from the money table', () => {
    for (const kind of EVENT_KINDS) expect(cateringBasis({ kind })).toBe(KIND_MONEY[kind].food);
  });

  it('prices kids’ parties by the head, a 60th like an intimate wedding and community food as prasad', () => {
    expect(cateringBasis({ kind: 'kids-birthday' })).toBe('party');
    expect(cateringBasis({ kind: 'sixtieth-birthday' })).toBe('intimate-wedding');
    expect(cateringBasis({ kind: 'society-festival' })).toBe('prasad');
    expect(cateringBasis({ kind: 'wedding' })).toBe('plate');
  });
});

describe('partyFoodBand', () => {
  it('is the published kids’ rate for a party and × the teen factor for teens', () => {
    expect(partyFoodBand('party')).toEqual(KIDS_PARTY_ITEMS_INR.foodPerHead);
    expect(partyFoodBand('teen-party')).toEqual({
      min: Math.round(KIDS_PARTY_ITEMS_INR.foodPerHead.min * TEEN_BAND_FACTOR),
      max: Math.round(KIDS_PARTY_ITEMS_INR.foodPerHead.max * TEEN_BAND_FACTOR),
    });
  });

  it('is null for every basis priced another way', () => {
    const others = CATERING_BASES.filter((basis) => basis !== 'party' && basis !== 'teen-party');
    for (const basis of others) expect(partyFoodBand(basis)).toBeNull();
  });
});

describe('CATERING_BASIS_INFO', () => {
  it('cites a source for every basis and calls every grade-D basis an assumption', () => {
    for (const basis of CATERING_BASES) {
      const info = CATERING_BASIS_INFO[basis];
      expect(info.sourceIds.length).toBeGreaterThan(0);
      if (info.confidence === 'D') expect(info.note).toMatch(/assumption|no published/i);
    }
  });
});
