/**
 * Tests for domain/budget-categories.ts: category labels, cost types and the rankable subset.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import {
  BUDGET_CATEGORIES,
  CATEGORY_PROFILES,
  COST_TYPES,
  RANKABLE_CATEGORIES,
} from '../domain/budget-categories.js';

describe('budget categories', () => {
  it('every category has English and Hindi labels and a cost type', () => {
    for (const category of BUDGET_CATEGORIES) {
      expect(CATEGORY_PROFILES[category].label.length).toBeGreaterThan(0);
      expect(CATEGORY_PROFILES[category].labelHi.length).toBeGreaterThan(0);
      expect(COST_TYPES).toContain(CATEGORY_PROFILES[category].costType);
    }
  });

  it('catering scales with guests; decor does not', () => {
    expect(CATEGORY_PROFILES.catering.costType).toBe('per-guest');
    expect(CATEGORY_PROFILES.decor.costType).toBe('fixed');
  });

  it('rankable categories exclude the contingency floor and the opt-in lines', () => {
    for (const category of RANKABLE_CATEGORIES) expect(BUDGET_CATEGORIES).toContain(category);
    const rankable: readonly string[] = RANKABLE_CATEGORIES;
    for (const excluded of ['contingency', 'planner', 'jewellery'])
      expect(rankable).not.toContain(excluded);
  });
});
