/**
 * Tests for engine/food.ts — the food plan (FOOD-01, DIET-01…04) and space check (SPACE-01).
 *
 * Responsibility: prove the food quantity follows grams per adult × adult-equivalent
 * servings (children half), each counter and caterer rule appears exactly when its diet,
 * tradition or guest mix calls for it, and the venue check reads unknown without an area and
 * ok / tight / over from the layout capacity. Boundary: expectations come from the domain
 * tables and the headcount engine.
 */
import { describe, expect, it } from 'vitest';
import { MEAL_WEIGHT } from '../domain/catering.js';
import { FOOD_GRAMS_PER_ADULT } from '../domain/food.js';
import { FUNCTION_PROFILES } from '../domain/functions.js';
import { layoutCapacity } from '../domain/space.js';
import { buildFoodPlan, buildSpaceCheck } from '../engine/food.js';
import { expectedAt, invitedAt } from '../engine/headcount.js';
import { createTraceLog } from '../engine/trace.js';
import { foodPlanSchema, spaceCheckSchema } from '../schemas/plan-people.js';
import type { EventContext } from '../schemas/context.js';
import { birthday, classified, community, homePuja, wedding } from './fixtures/engine-contexts.js';

const food = (context: EventContext): ReturnType<typeof buildFoodPlan> =>
  buildFoodPlan(classified(context), createTraceLog());
const space = (context: EventContext): ReturnType<typeof buildSpaceCheck> =>
  buildSpaceCheck(classified(context), createTraceLog());

describe('buildFoodPlan (FOOD-01)', () => {
  it('plans grams per adult × meal-weighted servings for an adult event', () => {
    const ctx = classified(wedding());
    const servings = ctx.functions.reduce(
      (sum, kind) => sum + expectedAt(ctx, kind) * MEAL_WEIGHT[FUNCTION_PROFILES[kind].meal],
      0,
    );
    const plan = food(wedding());
    expect(foodPlanSchema.safeParse(plan).success).toBe(true);
    expect(plan.totalKg.min).toBeCloseTo((servings * FOOD_GRAMS_PER_ADULT.min) / 1_000, 1);
    expect(plan.gramsPerAdult).toEqual({
      min: FOOD_GRAMS_PER_ADULT.min,
      max: FOOD_GRAMS_PER_ADULT.max,
    });
  });

  it('counts children at half an adult portion', () => {
    const party = food(birthday());
    const allAdults = food(birthday({ birthday: { age: 7, kidsCount: 0 } }));
    expect(party.totalKg.max).toBeLessThan(allAdults.totalKg.max);
  });
});

describe('buildFoodPlan counters and rules (DIET-01…04)', () => {
  it('runs veg, Jain and mocktail counters for the Jaipur sample', () => {
    const plan = food(wedding());
    expect(plan.counters).toEqual(['veg', 'jain', 'mocktails']);
    expect(plan.rules.map((rule) => rule.key)).toEqual(
      expect.arrayContaining(['jain', 'veg-satvik', 'no-alcohol', 'kids-elderly']),
    );
  });

  it('adds non-veg and halal counters and drops mocktails when alcohol is served', () => {
    const plan = food(
      wedding({
        tradition: 'muslim',
        alcohol: true,
        diet: { menu: 'non-veg', jainGuests: false, halal: false, satvik: false },
        accessibility: { elderly: false, wheelchair: false, kids: false },
      }),
    );
    expect(plan.counters).toEqual(['veg', 'non-veg', 'halal']);
    expect(plan.rules.map((rule) => rule.key)).toEqual(['halal']);
  });

  it('adds the satvik counter and the gurdwara rule for a Sikh wedding', () => {
    const sikh = food(
      wedding({
        tradition: 'punjabi-sikh',
        diet: { menu: 'veg', jainGuests: false, halal: false, satvik: true },
      }),
    );
    expect(sikh.counters).toContain('satvik');
    expect(sikh.rules.map((rule) => rule.key)).toContain('gurdwara');
  });

  it('keeps alcohol out of community events', () => {
    expect(food(community()).rules.map((rule) => rule.key)).toContain('no-alcohol');
  });
});

describe('buildSpaceCheck (SPACE-01)', () => {
  it('asks for the floor area when none is given', () => {
    const check = space(wedding());
    expect(spaceCheckSchema.safeParse(check).success).toBe(true);
    expect([check.status, check.capacity]).toEqual(['unknown', undefined]);
  });

  it('reads ok, tight and over against the layout capacity of the biggest function', () => {
    const puja = homePuja();
    const ctx = classified(puja);
    // The function with the most invited guests decides (the first one on a tie).
    const main = ctx.functions.reduce<(typeof ctx.functions)[number] | undefined>(
      (best, kind) =>
        best === undefined || invitedAt(ctx, kind) > invitedAt(ctx, best) ? kind : best,
      undefined,
    );
    if (main === undefined) throw new Error('a home puja has a default function');
    const layout = FUNCTION_PROFILES[main].layout;
    const peak = expectedAt(ctx, main);
    const areaFor = (capacity: number): number => {
      let area = 1;
      while (layoutCapacity(area, layout) < capacity) area += 1;
      return area;
    };
    expect(space(homePuja({ areaSqft: areaFor(peak * 2) })).status).toBe('ok');
    expect(space(homePuja({ areaSqft: areaFor(peak) })).status).toBe('tight');
    expect(space(homePuja({ areaSqft: areaFor(Math.max(1, peak - 1)) })).status).toBe('over');
    expect(space(homePuja({ areaSqft: areaFor(peak) })).capacity).toBe(
      layoutCapacity(areaFor(peak), layout),
    );
  });
});
