/**
 * Tests for domain/catering.ts: plate bands, caterer-class factors, service charge, floors,
 * meal weights, the playbook's royalty and staffing figures, and rooms.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import {
  CATERER_CLASS_VEG_INR,
  CATERING_LEVELS,
  FLOOR_PLATE_VEG_INR,
  GUESTS_PER_SERVER,
  LEVEL_FACTOR,
  MEAL_WEIGHT,
  NONVEG_MULTIPLIER,
  OUTSIDE_CATERER_ROYALTY_INR,
  PER_PLATE_INR,
  ROOM_RATE_PER_NIGHT_INR,
  SERVICE_CHARGE_PCT,
  SNACK_MEAL_PER_HEAD_INR,
} from '../domain/catering.js';
import { CITY_TIERS, TIER_PROFILES } from '../domain/cities.js';
import type { NumberRange } from '../domain/units.js';

/** The non-veg column is veg × 1.35 rounded to a round number; allow 5% for that rounding. */
const ROUNDING_SHARE = 0.05;

/** Class and meal factors are rounded to the nearest quarter, so they sit within half of one. */
const HALF_FACTOR_STEP = 0.125;

const midpoint = (band: NumberRange): number => (band.min + band.max) / 2;

/** How far a factor is from the band's midpoint over the standard class's midpoint. */
function distanceFromRatio(factor: number, band: NumberRange): number {
  return Math.abs(factor - midpoint(band) / midpoint(CATERER_CLASS_VEG_INR.standard));
}

describe('per-plate bands (CST-01)', () => {
  it('veg bands fall with the tier and their midpoints follow the tier multipliers', () => {
    const vegMidpoint = (tier: (typeof CITY_TIERS)[number]): number =>
      midpoint(PER_PLATE_INR[tier].veg);
    for (const tier of CITY_TIERS) {
      const derived = vegMidpoint('metro') * TIER_PROFILES[tier].costMultiplier;
      expect(Math.abs(vegMidpoint(tier) - derived) / derived).toBeLessThanOrEqual(ROUNDING_SHARE);
    }
  });

  it('non-veg bands are the veg bands times the non-veg multiplier', () => {
    for (const tier of CITY_TIERS) {
      const band = PER_PLATE_INR[tier];
      for (const end of ['min', 'max'] as const) {
        const derived = band.veg[end] * NONVEG_MULTIPLIER;
        expect(Math.abs(band.nonVeg[end] - derived) / derived).toBeLessThanOrEqual(ROUNDING_SHARE);
      }
    }
  });
});

describe('caterer classes (LEV-03)', () => {
  it('class bands are ordered and rise from community to premium', () => {
    const mins = CATERING_LEVELS.map((level) => CATERER_CLASS_VEG_INR[level].min);
    expect(mins).toEqual([...mins].sort((a, b) => a - b));
    for (const level of CATERING_LEVELS) {
      expect(CATERER_CLASS_VEG_INR[level].min).toBeLessThan(CATERER_CLASS_VEG_INR[level].max);
    }
  });

  it('each level factor is its band midpoint over the standard midpoint, to the nearest quarter', () => {
    expect(LEVEL_FACTOR.standard).toBe(1);
    for (const level of CATERING_LEVELS) {
      const distance = distanceFromRatio(LEVEL_FACTOR[level], CATERER_CLASS_VEG_INR[level]);
      expect(distance).toBeLessThanOrEqual(HALF_FACTOR_STEP);
    }
  });
});

describe('service charge (CST-02)', () => {
  it('is zero at a community caterer and rises with the class', () => {
    expect(SERVICE_CHARGE_PCT.community).toBe(0);
    const charges = CATERING_LEVELS.map((level) => SERVICE_CHARGE_PCT[level]);
    expect(charges).toEqual([...charges].sort((a, b) => a - b));
  });
});

describe('floor plate', () => {
  it('metro is the community minimum and smaller tiers are their standard low × the community factor', () => {
    expect(FLOOR_PLATE_VEG_INR.metro).toBe(CATERER_CLASS_VEG_INR.community.min);
    for (const tier of ['tier2', 'tier3'] as const) {
      expect(FLOOR_PLATE_VEG_INR[tier]).toBe(PER_PLATE_INR[tier].veg.min * LEVEL_FACTOR.community);
    }
  });

  it('never exceeds the tier’s own lowest standard plate', () => {
    for (const tier of CITY_TIERS) {
      expect(FLOOR_PLATE_VEG_INR[tier]).toBeLessThanOrEqual(PER_PLATE_INR[tier].veg.min);
    }
  });
});

describe('meals (CST-04)', () => {
  it('lunch and dinner are a full plate; snack meals weigh their band against the standard plate', () => {
    expect([MEAL_WEIGHT.lunch, MEAL_WEIGHT.dinner]).toEqual([1, 1]);
    for (const meal of ['hi-tea', 'snacks'] as const) {
      const distance = distanceFromRatio(MEAL_WEIGHT[meal], SNACK_MEAL_PER_HEAD_INR[meal]);
      expect(distance).toBeLessThanOrEqual(HALF_FACTOR_STEP);
    }
    expect(MEAL_WEIGHT.snacks).toBeLessThan(MEAL_WEIGHT['hi-tea']);
  });

  it('snacks cost less than hi-tea', () => {
    expect(SNACK_MEAL_PER_HEAD_INR.snacks.max).toBeLessThan(SNACK_MEAL_PER_HEAD_INR['hi-tea'].max);
  });
});

describe('playbook figures (VEN-03)', () => {
  it('the royalty is an ordered range and a plated meal needs more servers than a buffet', () => {
    expect(OUTSIDE_CATERER_ROYALTY_INR.min).toBeLessThan(OUTSIDE_CATERER_ROYALTY_INR.max);
    expect(GUESTS_PER_SERVER.plated.max).toBeLessThan(GUESTS_PER_SERVER.buffet.min);
  });
});

describe('room rates (CST-05)', () => {
  it('fall from destination to metro to smaller cities', () => {
    expect(ROOM_RATE_PER_NIGHT_INR.destination).toBeGreaterThan(ROOM_RATE_PER_NIGHT_INR.metro);
    expect(ROOM_RATE_PER_NIGHT_INR.metro).toBeGreaterThan(ROOM_RATE_PER_NIGHT_INR.tier2);
    expect(ROOM_RATE_PER_NIGHT_INR.tier2).toBeGreaterThan(ROOM_RATE_PER_NIGHT_INR.tier3);
  });
});
