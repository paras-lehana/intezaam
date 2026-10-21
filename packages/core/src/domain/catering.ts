/**
 * Catering prices (CST-01…05) — per plate by city tier, caterer class, diet and meal.
 *
 * Responsibility: every table the catering engine prices from — per-plate bands by tier
 * (veg sourced, non-veg derived), the non-veg multiplier, the veg bands by caterer class and
 * the class factors derived from them (09 Gap 2 §2.5), the service charge by class (CST-02),
 * the cheapest credible plate (Gap 2 §2.4), the anchor cities that price like a metro, snack
 * meal prices and meal weights (CST-04), the reception discount, the royalty and staffing
 * figures the caterer and venue questions quote (VEN-03) and the assumed room rates (CST-05).
 * Boundary: published ranges are estimates, never quotes; grade-D values are labelled.
 */
import type { AnchorCity, CityTier } from './cities.js';
import type { NumberRange } from './units.js';
import { range } from './units.js';

/** What a function serves; lunch and dinner are priced per plate, the rest per head. */
export const MEAL_TYPES = ['lunch', 'dinner', 'hi-tea', 'snacks'] as const;

export type MealType = (typeof MEAL_TYPES)[number];

export interface PlateBand {
  readonly veg: NumberRange;
  readonly nonVeg: NumberRange;
}

/**
 * CST-01: food only, before GST and service (S-RSA-2026, 2026). Veg is grade C; non-veg is
 * veg × 1.30–1.40, rounded (grade D).
 */
export const PER_PLATE_INR: Readonly<Record<CityTier, PlateBand>> = {
  metro: { veg: range(1_200, 1_800), nonVeg: range(1_550, 2_500) },
  tier2: { veg: range(800, 1_200), nonVeg: range(1_050, 1_700) },
  tier3: { veg: range(500, 800), nonVeg: range(650, 1_100) },
};

/** "A non-veg replacement adds 30–40%" (S-RSA-2026); 1.35 is the midpoint. */
export const NONVEG_MULTIPLIER = 1.35;

/**
 * Caterer classes the plan prices at: three of velvetknot's five service levels (Gap 2 §2.5).
 * Five-star in-house and ultra-luxury are left out because no plan input selects them.
 */
export const CATERING_LEVELS = ['community', 'standard', 'premium'] as const;

export type CateringLevel = (typeof CATERING_LEVELS)[number];

/** LEV-03: all-India veg plate bands by caterer class, before tax and service (S-VKPLATE-2026). */
export const CATERER_CLASS_VEG_INR: Readonly<Record<CateringLevel, NumberRange>> = {
  community: range(500, 1_200),
  standard: range(800, 2_500),
  premium: range(2_000, 4_500),
};

/** Factors are rounded to the nearest quarter: a blog's price band cannot support two decimals. */
const FACTOR_STEP = 0.25;

/** A band's midpoint as a multiple of the standard caterer's midpoint, to the nearest quarter. */
function relativeToStandard(band: NumberRange): number {
  const standard = CATERER_CLASS_VEG_INR.standard;
  const ratio = (band.min + band.max) / (standard.min + standard.max);
  return Math.round(ratio / FACTOR_STEP) * FACTOR_STEP;
}

/**
 * Gap 2 §2.5 (grade D): price relative to the tier's standard band — each class's veg
 * midpoint ÷ the standard midpoint (community 0.515 → 0.5, premium 1.97 → 2).
 */
export const LEVEL_FACTOR: Readonly<Record<CateringLevel, number>> = {
  community: relativeToStandard(CATERER_CLASS_VEG_INR.community),
  standard: relativeToStandard(CATERER_CLASS_VEG_INR.standard),
  premium: relativeToStandard(CATERER_CLASS_VEG_INR.premium),
};

/**
 * CST-02 (Gap 2 §2.6, grade C): the service charge alone — "often 5 to 10 percent"
 * (S-VKPLATE-2026), none at a community caterer. GST is CST-06 and is never added here.
 */
export const SERVICE_CHARGE_PCT: Readonly<Record<CateringLevel, number>> = {
  community: 0,
  standard: 5,
  premium: 10,
};

/**
 * The cheapest credible veg plate by tier (Gap 2 §2.4, grade C/D): metro = the all-India
 * community minimum; tier-2 and tier-3 = the tier's standard low × the community factor,
 * which matches halwai listings of ₹450–500 in Jaipur and Udaipur.
 */
export const FLOOR_PLATE_VEG_INR: Readonly<Record<CityTier, number>> = {
  metro: CATERER_CLASS_VEG_INR.community.min,
  tier2: PER_PLATE_INR.tier2.veg.min * LEVEL_FACTOR.community,
  tier3: PER_PLATE_INR.tier3.veg.min * LEVEL_FACTOR.community,
};

/**
 * Anchor cities whose caterers price like a metro (Gap 2 §2.4): Jaipur's standard quote of
 * ₹1,200–2,000 sits in the metro cell; Chennai by convention (grade D).
 */
export const CATERING_TIER_BY_ANCHOR: Readonly<Partial<Record<AnchorCity, CityTier>>> = {
  jaipur: 'metro',
  chennai: 'metro',
};

/** CST-04: per-head prices for meals that are not a full plate (S-VKPLATE-2026, grade C). */
export const SNACK_MEAL_PER_HEAD_INR: Readonly<Record<'hi-tea' | 'snacks', NumberRange>> = {
  'hi-tea': range(400, 1_200),
  snacks: range(200, 600),
};

/**
 * Gap 2 §2.4 rule 2 (grade D): a meal's weight against a full plate — each snack band's
 * midpoint ÷ the standard plate midpoint (hi-tea 0.48 → 0.5, late snacks 0.24 → 0.25).
 */
export const MEAL_WEIGHT: Readonly<Record<MealType, number>> = {
  lunch: 1,
  dinner: 1,
  'hi-tea': relativeToStandard(SNACK_MEAL_PER_HEAD_INR['hi-tea']),
  snacks: relativeToStandard(SNACK_MEAL_PER_HEAD_INR.snacks),
};

/** CST-04: reception food is 10–20% cheaper than the wedding dinner (S-RSA-2026). */
export const RECEPTION_FOOD_DISCOUNT_PCT = range(10, 20);

/** VEN-03: hotels charge an outside caterer a royalty per plate (S-VKPLATE-2026, grade C). */
export const OUTSIDE_CATERER_ROYALTY_INR = range(300, 1_000);

/** VEN-03: guests one server can look after, at a buffet and when plated (S-RSA-2026, grade C). */
export const GUESTS_PER_SERVER: Readonly<Record<'buffet' | 'plated', NumberRange>> = {
  buffet: range(40, 50),
  plated: range(10, 15),
};

/** CST-05: rooms are not in any source; these are the owner's planner guesses (grade D). */
export const ROOM_RATE_PER_NIGHT_INR: Readonly<Record<CityTier | 'destination', number>> = {
  metro: 4_000,
  tier2: 2_500,
  tier3: 2_000,
  destination: 6_000,
};

/** Outstation guests usually stay the wedding day and the night before (grade D). */
export const DEFAULT_ROOM_NIGHTS = 2;
