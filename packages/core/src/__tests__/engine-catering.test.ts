/**
 * Tests for engine/catering.ts — per-plate grid, service charge, meals and the food floor.
 *
 * Responsibility: prove plates follow the tier band × service level grid (community low =
 * the floor plate), non-veg pricing, the reception discount, snack pricing, party food at
 * the published per-head rate (teens × 1.2), the season factor, GST applied once and the
 * catering floor arithmetic.
 * Boundary: expected values are computed from the domain tables, never typed in.
 */
import { describe, expect, it } from 'vitest';
import {
  FLOOR_PLATE_VEG_INR,
  LEVEL_FACTOR,
  MEAL_WEIGHT,
  NONVEG_MULTIPLIER,
  PER_PLATE_INR,
  RECEPTION_FOOD_DISCOUNT_PCT,
  SERVICE_CHARGE_PCT,
  SNACK_MEAL_PER_HEAD_INR,
} from '../domain/catering.js';
import { KIDS_PARTY_ITEMS_INR, TEEN_BAND_FACTOR } from '../domain/costs.js';
import { FUNCTION_PROFILES } from '../domain/functions.js';
import { gstRateForCategory } from '../domain/gst.js';
import { OFF_PEAK_PRICE_FACTOR } from '../domain/seasons.js';
import {
  allInFactor,
  cateringFloorInr,
  cateringRange,
  perHeadRange,
  plateBand,
  seasonFactor,
  usesNonVegPricing,
} from '../engine/catering.js';
import { expectedAt } from '../engine/headcount.js';
import { birthday, classified, wedding } from './fixtures/engine-contexts.js';

const GST = (gstRateForCategory('catering') ?? 0) / 100;

describe('plateBand (CST-01)', () => {
  const ctx = classified(wedding());
  const band = PER_PLATE_INR[ctx.cateringTier].veg;

  it('uses the tier band for a standard caterer and doubles it for premium', () => {
    expect(plateBand(ctx, 'standard')).toEqual(band);
    expect(plateBand(ctx, 'premium')).toEqual({
      min: Math.round(band.min * LEVEL_FACTOR.premium),
      max: Math.round(band.max * LEVEL_FACTOR.premium),
    });
  });

  it('starts a community caterer at the floor plate', () => {
    expect(plateBand(ctx, 'community')).toEqual({
      min: FLOOR_PLATE_VEG_INR[ctx.cateringTier],
      max: Math.round(band.max * LEVEL_FACTOR.community),
    });
  });

  it('prices a mixed menu at the non-veg band, floor included', () => {
    const mixed = classified(wedding({ diet: { ...wedding().diet, menu: 'mixed' } }));
    expect(usesNonVegPricing(mixed)).toBe(true);
    expect(plateBand(mixed, 'standard')).toEqual(PER_PLATE_INR[mixed.cateringTier].nonVeg);
    expect(plateBand(mixed, 'community').min).toBe(
      Math.round(FLOOR_PLATE_VEG_INR[mixed.cateringTier] * NONVEG_MULTIPLIER),
    );
  });
});

describe('perHeadRange (CST-04)', () => {
  const ctx = classified(wedding());

  it('prices hi-tea per head and scales it by the service level', () => {
    expect(perHeadRange(ctx, 'mehendi', 'standard')).toEqual(SNACK_MEAL_PER_HEAD_INR['hi-tea']);
    expect(perHeadRange(ctx, 'mehendi', 'community').max).toBe(
      Math.round(SNACK_MEAL_PER_HEAD_INR['hi-tea'].max * LEVEL_FACTOR.community),
    );
  });

  it('plans reception food 10% cheaper than the wedding dinner', () => {
    const dinner = perHeadRange(ctx, 'wedding', 'standard');
    expect(perHeadRange(ctx, 'reception', 'standard').max).toBe(
      Math.round(dinner.max * (1 - RECEPTION_FOOD_DISCOUNT_PCT.min / 100)),
    );
  });
});

describe('party food (CST-01 by kind)', () => {
  it('prices every guest at a kids’ party at the published party rate, whatever the class', () => {
    const ctx = classified(birthday());
    expect(perHeadRange(ctx, 'party', 'standard')).toEqual(KIDS_PARTY_ITEMS_INR.foodPerHead);
    expect(perHeadRange(ctx, 'party', 'premium')).toEqual(KIDS_PARTY_ITEMS_INR.foodPerHead);
  });

  it('prices a teen party at the kids’ rate × the teen factor', () => {
    const teen = classified(birthday({ kind: 'teen-birthday' }));
    expect(perHeadRange(teen, 'party', 'standard').max).toBe(
      Math.round(KIDS_PARTY_ITEMS_INR.foodPerHead.max * TEEN_BAND_FACTOR),
    );
  });
});

describe('factors', () => {
  it('adds service charge then GST, once each', () => {
    expect(allInFactor('community')).toBeCloseTo(1 + GST);
    expect(allInFactor('standard')).toBeCloseTo(
      (1 + SERVICE_CHARGE_PCT.standard / 100) * (1 + GST),
    );
  });

  it('applies the off-peak factor only off-peak or on a weekday', () => {
    expect(seasonFactor(classified(birthday()))).toBe(OFF_PEAK_PRICE_FACTOR);
    expect(seasonFactor(classified(wedding({ dateIso: '2027-02-20' })))).toBe(1);
  });
});

describe('cateringRange and cateringFloorInr', () => {
  it('sums every function bottom-up with the all-in and season factors', () => {
    const ctx = classified(wedding());
    const factor = allInFactor('standard') * seasonFactor(ctx);
    const low = ctx.functions.reduce(
      (sum, kind) => sum + expectedAt(ctx, kind) * perHeadRange(ctx, kind, 'standard').min * factor,
      0,
    );
    const range = cateringRange(ctx, 'standard');
    expect(range.low).toBe(Math.round(low));
    expect(range.low).toBeLessThan(range.mid);
    expect(range.mid).toBeLessThan(range.high);
  });

  it('prices the food floor at the cheapest plate, meal-weighted, plus GST', () => {
    const ctx = classified(wedding());
    const plates = ctx.functions.reduce(
      (sum, kind) => sum + expectedAt(ctx, kind) * MEAL_WEIGHT[FUNCTION_PROFILES[kind].meal],
      0,
    );
    expect(cateringFloorInr(ctx)).toBe(
      Math.round(plates * FLOOR_PLATE_VEG_INR[ctx.cateringTier] * (1 + GST)),
    );
  });
});
