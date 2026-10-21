/**
 * Food plan and venue space (FOOD-01, DIET-01…04, SPACE-01).
 *
 * Responsibility: how much food to plan (600–750 g per adult per sitting, children half,
 * lighter meals by weight), which counters to run (veg, non-veg, Jain, halal, satvik,
 * mocktails), the caterer rules each diet brings, and whether the venue floor holds the
 * biggest function (85% of the area ÷ space per guest for its layout). Boundary: planning
 * quantities and checks; the caterer's menu decides the final list.
 */
import { MEAL_WEIGHT } from '../domain/catering.js';
import { DIET_RULE_KEYS, DIET_RULES, type DietRuleKey } from '../domain/diet.js';
import { FOOD_GRAMS_PER_ADULT, KIDS_PORTION_FACTOR } from '../domain/food.js';
import { FUNCTION_PROFILES, type FunctionKind } from '../domain/functions.js';
import { layoutCapacity, SPACE_LAYOUT_PROFILES } from '../domain/space.js';
import { FOOD_COUNTERS, type FoodPlan, type SpaceCheck } from '../schemas/plan-people.js';
import { usesNonVegPricing } from './catering.js';
import { attendanceRate, expectedAt, invitedAt, partyChildren } from './headcount.js';
import type { TraceLog } from './trace.js';
import type { ClassifiedContext } from './types.js';

type FoodCounter = (typeof FOOD_COUNTERS)[number];

const GRAMS_PER_KG = 1_000;
/** Kilograms to one decimal place: enough for a caterer's order. */
const KG_DECIMALS = 10;
/** SPACE-01 (grade D): under 10% spare floor is "tight". */
const TIGHT_SHARE = 0.9;

/** Adult-equivalent eaters at one function: children count half (FOOD-01). */
function adultEquivalents(ctx: ClassifiedContext, kind: FunctionKind): number {
  const expected = expectedAt(ctx, kind);
  const children = partyChildren(ctx);
  if (children === null) return expected;
  const kids = Math.min(expected, Math.round(children * attendanceRate(ctx)));
  return expected - kids + kids * KIDS_PORTION_FACTOR;
}

function countersFor(ctx: ClassifiedContext): FoodCounter[] {
  const diet = ctx.input.diet;
  const on: Record<FoodCounter, boolean> = {
    veg: true,
    'non-veg': usesNonVegPricing(ctx),
    jain: diet.menu === 'jain' || diet.jainGuests,
    halal: diet.halal || ctx.tradition === 'muslim',
    satvik: diet.satvik,
    mocktails: !ctx.input.alcohol,
  };
  return FOOD_COUNTERS.filter((counter) => on[counter]);
}

function rulesFor(ctx: ClassifiedContext, counters: readonly FoodCounter[]): DietRuleKey[] {
  const vegMenu = ctx.input.diet.menu === 'veg' || ctx.input.diet.menu === 'jain';
  const on: Record<DietRuleKey, boolean> = {
    jain: counters.includes('jain'),
    halal: counters.includes('halal'),
    'veg-satvik': vegMenu || counters.includes('satvik'),
    gurdwara: ctx.traditionProfile?.dietRule === 'gurdwara',
    'no-alcohol': !ctx.input.alcohol && (counters.includes('jain') || ctx.family === 'community'),
    'kids-elderly': partyChildren(ctx) !== null || ctx.accessNeeds.length > 0,
  };
  return DIET_RULE_KEYS.filter((key) => on[key]);
}

/**
 * The food plan: quantities, counters and caterer rules.
 * @example
 * buildFoodPlan(jaipurCtx, trace).counters; // ['veg', 'jain', 'mocktails']
 */
export function buildFoodPlan(ctx: ClassifiedContext, trace: TraceLog): FoodPlan {
  const eaters = ctx.functions.reduce(
    (sum, kind) => sum + adultEquivalents(ctx, kind) * MEAL_WEIGHT[FUNCTION_PROFILES[kind].meal],
    0,
  );
  const kg = (grams: number): number =>
    Math.round(((eaters * grams) / GRAMS_PER_KG) * KG_DECIMALS) / KG_DECIMALS;
  const counters = countersFor(ctx);
  const keys = rulesFor(ctx, counters);
  const quantityId = trace.add({
    ruleId: 'FOOD-01',
    inputs: [
      ['adult-equivalent servings', Math.round(eaters)],
      ['functions', ctx.functions.length],
    ],
    effect: `Plan ${kg(FOOD_GRAMS_PER_ADULT.min)}–${kg(FOOD_GRAMS_PER_ADULT.max)} kg of food in all: ${FOOD_GRAMS_PER_ADULT.min}–${FOOD_GRAMS_PER_ADULT.max} g per adult per sitting, children half.`,
  });
  return {
    gramsPerAdult: { min: FOOD_GRAMS_PER_ADULT.min, max: FOOD_GRAMS_PER_ADULT.max },
    totalKg: { min: kg(FOOD_GRAMS_PER_ADULT.min), max: kg(FOOD_GRAMS_PER_ADULT.max) },
    counters,
    rules: keys.map((key) => ({
      key,
      title: DIET_RULES[key].title,
      items: [...DIET_RULES[key].items],
    })),
    traceIds: [
      quantityId,
      ...[...new Set(keys.map((key) => DIET_RULES[key].ruleId))].map((id) => trace.rule(id)),
    ],
  };
}

/** The function with the most invited guests decides the space check (first on a tie). */
function biggestFunction(ctx: ClassifiedContext): FunctionKind | undefined {
  return ctx.functions.reduce<FunctionKind | undefined>(
    (best, kind) =>
      best === undefined || invitedAt(ctx, kind) > invitedAt(ctx, best) ? kind : best,
    undefined,
  );
}

function spaceStatus(peak: number, capacity: number): SpaceCheck['status'] {
  if (peak > capacity) return 'over';
  return peak > capacity * TIGHT_SHARE ? 'tight' : 'ok';
}

/**
 * SPACE-01: whether the venue floor holds the biggest function.
 * @example
 * buildSpaceCheck(ctxWithArea(3000), trace).capacity; // floor(3000 × 0.85 ÷ 8)
 */
export function buildSpaceCheck(ctx: ClassifiedContext, trace: TraceLog): SpaceCheck {
  const main = biggestFunction(ctx);
  const layout = main === undefined ? 'reception-mixed' : FUNCTION_PROFILES[main].layout;
  const sqftPerGuest = SPACE_LAYOUT_PROFILES[layout].defaultSqftPerGuest;
  const area = ctx.input.areaSqft;
  const peak = main === undefined ? ctx.guests : expectedAt(ctx, main);
  if (area === undefined) {
    const id = trace.add({
      ruleId: 'SPACE-01',
      inputs: [
        ['layout', layout],
        ['area', 'not given'],
      ],
      effect: `Add the floor area to check capacity; this layout needs about ${sqftPerGuest} sq ft a guest.`,
    });
    return { layout, sqftPerGuest, status: 'unknown', traceIds: [id] };
  }
  const capacity = layoutCapacity(area, layout);
  const status = spaceStatus(peak, capacity);
  const id = trace.add({
    ruleId: 'SPACE-01',
    inputs: [
      ['area', area],
      ['layout', layout],
      ['expected at the biggest function', peak],
    ],
    effect: `${area} sq ft holds about ${capacity} guests in this layout; ${peak} are expected: ${status}.`,
  });
  return { areaSqft: area, layout, sqftPerGuest, capacity, status, traceIds: [id] };
}
