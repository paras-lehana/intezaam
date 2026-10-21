/**
 * Tests for domain/cities.ts: tier multipliers and city anchors.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import {
  ANCHOR_CITIES,
  CITY_ANCHORS,
  CITY_TIERS,
  TIER_PROFILES,
  UNKNOWN_CITY_TIER,
} from '../domain/cities.js';
import { isSourceId } from '../domain/sources.js';

describe('city tiers (CTX-02)', () => {
  it('cost multipliers fall from metro to tier-3 and metro is the base', () => {
    const multipliers = CITY_TIERS.map((tier) => TIER_PROFILES[tier].costMultiplier);
    expect(multipliers[0]).toBe(1);
    expect(multipliers).toEqual([...multipliers].sort((a, b) => b - a));
  });

  it('unknown cities are priced in the middle tier', () => {
    expect(UNKNOWN_CITY_TIER).toBe('tier2');
  });

  it('every tier cites a registered source', () => {
    for (const tier of CITY_TIERS) expect(isSourceId(TIER_PROFILES[tier].sourceId)).toBe(true);
  });
});

describe('city anchors', () => {
  it('are 300-guest, three-function mid-range ranges in rupees', () => {
    for (const city of ANCHOR_CITIES) {
      const anchor = CITY_ANCHORS[city];
      expect(anchor.midRangeInr.min).toBeLessThan(anchor.midRangeInr.max);
      expect(anchor.referenceGuests).toBe(CITY_ANCHORS.mumbai.referenceGuests);
      expect(anchor.confidence).toBe('C');
    }
  });

  it('Mumbai is the most expensive anchor and Kolkata the least', () => {
    const mins = ANCHOR_CITIES.map((city) => CITY_ANCHORS[city].midRangeInr.min);
    expect(CITY_ANCHORS.mumbai.midRangeInr.min).toBe(Math.max(...mins));
    expect(CITY_ANCHORS.kolkata.midRangeInr.min).toBe(Math.min(...mins));
  });
});
