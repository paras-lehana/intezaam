/**
 * Catering prices (CST-01…04) — per head by event kind, city tier, service level, diet and meal.
 *
 * Responsibility: apply the catering tables in domain/catering.ts — the per-plate grid (tier
 * band × caterer class, 09 Gap 2 §2.5), the party rate for children's parties
 * (catering-basis.ts), the service charge (CST-02, service only — GST is added once, CST-06),
 * meal pricing per function (CST-04), the off-peak factor (CST-03), the bottom-up catering
 * range and the cheapest-credible catering floor the wedding money verdict starts from (Gap 2
 * §2.4). Boundary: estimates, never quotes; the tables live in the domain, this module only
 * computes; the cost check and verdict read these numbers; community food is priced in
 * community-money.ts.
 */
import {
  type CateringLevel,
  FLOOR_PLATE_VEG_INR,
  LEVEL_FACTOR,
  type MealType,
  MEAL_WEIGHT,
  NONVEG_MULTIPLIER,
  PER_PLATE_INR,
  RECEPTION_FOOD_DISCOUNT_PCT,
  SERVICE_CHARGE_PCT,
  SNACK_MEAL_PER_HEAD_INR,
} from '../domain/catering.js';
import { DIET_PROFILE_INFO } from '../domain/diet.js';
import { FUNCTION_PROFILES, type FunctionKind } from '../domain/functions.js';
import { gstRateForCategory } from '../domain/gst.js';
import { OFF_PEAK_PRICE_FACTOR } from '../domain/seasons.js';
import type { NumberRange } from '../domain/units.js';
import { formatPercent } from '../format.js';
import type { InrEstimate } from '../schemas/common.js';
import { cateringBasis, partyFoodBand } from './catering-basis.js';
import { expectedAt } from './headcount.js';
import { PERCENT } from './percent.js';
import type { ClassifiedContext } from './types.js';

/** Catering GST (CST-06): 5% outdoor catering; never added a second time. */
export const CATERING_GST_PCT = gstRateForCategory('catering') ?? 0;

/** CST-03's saving as readers see it ("15%"), from the same factor the prices use. */
export const OFF_PEAK_SAVING_LABEL = formatPercent((1 - OFF_PEAK_PRICE_FACTOR) * PERCENT);

/**
 * True when plates are priced at the non-veg rate (CST-01).
 * @example
 * usesNonVegPricing(ctxWithMenu('mixed')); // true
 */
export function usesNonVegPricing(ctx: ClassifiedContext): boolean {
  return DIET_PROFILE_INFO[ctx.input.diet.menu].nonVegPricing;
}

/**
 * CST-03: the off-peak or weekday factor on venue, catering and decor (1 when neither).
 * @example
 * seasonFactor(julyCtx); // 0.85
 */
export function seasonFactor(ctx: ClassifiedContext): number {
  return ctx.season.offPeak || ctx.season.weekday ? OFF_PEAK_PRICE_FACTOR : 1;
}

/**
 * Service charge then GST, each applied once (CST-02 + CST-06).
 * @example
 * allInFactor('standard'); // 1.1025
 */
export function allInFactor(level: CateringLevel): number {
  return (1 + SERVICE_CHARGE_PCT[level] / PERCENT) * (1 + CATERING_GST_PCT / PERCENT);
}

/**
 * CST-01: a lunch or dinner plate before service and GST, for a service level.
 * @example
 * plateBand(metroVegCtx, 'standard'); // { min: 1200, max: 1800 }
 */
export function plateBand(ctx: ClassifiedContext, level: CateringLevel): NumberRange {
  const tierBand = PER_PLATE_INR[ctx.cateringTier];
  const nonVeg = usesNonVegPricing(ctx);
  const standard = nonVeg ? tierBand.nonVeg : tierBand.veg;
  const factor = LEVEL_FACTOR[level];
  if (level === 'community') {
    const floor = FLOOR_PLATE_VEG_INR[ctx.cateringTier];
    return {
      min: nonVeg ? Math.round(floor * NONVEG_MULTIPLIER) : floor,
      max: Math.round(standard.max * factor),
    };
  }
  return { min: Math.round(standard.min * factor), max: Math.round(standard.max * factor) };
}

function mealBand(ctx: ClassifiedContext, meal: MealType, level: CateringLevel): NumberRange {
  if (meal === 'lunch' || meal === 'dinner') return plateBand(ctx, level);
  const snack = SNACK_MEAL_PER_HEAD_INR[meal];
  return {
    min: Math.round(snack.min * LEVEL_FACTOR[level]),
    max: Math.round(snack.max * LEVEL_FACTOR[level]),
  };
}

/**
 * CST-04: per-head food price at one function — the party rate at a children's party,
 * else the meal's band (reception food is 10% cheaper, the conservative end of 10–20%).
 * @example
 * perHeadRange(ctx, 'mehendi', 'standard'); // the hi-tea band, ₹400–1,200
 */
export function perHeadRange(
  ctx: ClassifiedContext,
  kind: FunctionKind,
  level: CateringLevel,
): NumberRange {
  const party = partyFoodBand(cateringBasis(ctx));
  if (party !== null) return party;
  const band = mealBand(ctx, FUNCTION_PROFILES[kind].meal, level);
  const discount = kind === 'reception' ? 1 - RECEPTION_FOOD_DISCOUNT_PCT.min / PERCENT : 1;
  return { min: Math.round(band.min * discount), max: Math.round(band.max * discount) };
}

/**
 * Bottom-up catering cost for every planned function: expected guests × per-head price ×
 * service and GST × the season factor, as a low–mid–high range in whole rupees.
 * @example
 * cateringRange(jaipurCtx, 'standard').mid > 0; // true
 */
export function cateringRange(ctx: ClassifiedContext, level: CateringLevel): InrEstimate {
  const factor = allInFactor(level) * seasonFactor(ctx);
  let low = 0;
  let high = 0;
  for (const kind of ctx.functions) {
    const guests = expectedAt(ctx, kind);
    const band = perHeadRange(ctx, kind, level);
    low += guests * band.min * factor;
    high += guests * band.max * factor;
  }
  return { low: Math.round(low), mid: Math.round((low + high) / 2), high: Math.round(high) };
}

/**
 * Gap 2 §2.4 rule 2: food for every function at the cheapest credible plate (meal-weighted,
 * non-veg × 1.35, plus GST, no service charge), in whole rupees.
 * @example
 * cateringFloorInr(jaipurCtx); // Σ expected × weight × ₹500 × 1.05
 */
export function cateringFloorInr(ctx: ClassifiedContext): number {
  const plate = plateBand(ctx, 'community').min;
  const plates = ctx.functions.reduce(
    (sum, kind) => sum + expectedAt(ctx, kind) * MEAL_WEIGHT[FUNCTION_PROFILES[kind].meal],
    0,
  );
  return Math.round(plates * plate * (1 + CATERING_GST_PCT / PERCENT));
}
