/**
 * Tests for domain/food.ts: food quantity constants.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import {
  FOOD_GRAMS_PER_ADULT,
  ICE_CREAM_ML_PER_GUEST,
  KIDS_PORTION_FACTOR,
  MIXED_MENU_VEG_SHARE,
  RAW_GRAMS_PER_GUEST,
} from '../domain/food.js';

describe('food quantities (FOOD-01)', () => {
  it('per-adult grams are an ordered range and raw ingredients fit inside it', () => {
    expect(FOOD_GRAMS_PER_ADULT.min).toBeLessThan(FOOD_GRAMS_PER_ADULT.max);
    const raw = Object.values(RAW_GRAMS_PER_GUEST).reduce((sum, grams) => sum + grams, 0);
    expect(raw).toBeLessThan(FOOD_GRAMS_PER_ADULT.min);
  });

  it('shares and factors are proper fractions', () => {
    expect(MIXED_MENU_VEG_SHARE).toBeGreaterThan(0.5);
    expect(MIXED_MENU_VEG_SHARE).toBeLessThan(1);
    expect(KIDS_PORTION_FACTOR).toBeGreaterThan(0);
    expect(KIDS_PORTION_FACTOR).toBeLessThan(1);
    expect(ICE_CREAM_ML_PER_GUEST).toBeGreaterThan(0);
  });
});
