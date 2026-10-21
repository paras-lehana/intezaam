/**
 * Tests for domain/budget-shifts.ts: that every shift nets to zero and never takes a line negative.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { BUDGET_CATEGORIES } from '../domain/budget-categories.js';
import {
  DESTINATION_SHIFT_BP,
  HOME_PARTY_VENUE_BP,
  OUTSTATION_ACCOMMODATION_BP,
  OUTSTATION_ACCOMMODATION_DEFAULT_BP,
  PLANNER_DEFAULT_BP,
  PLANNER_SHARE_BP,
  PRIORITY_SHIFT_BP,
  SCALE_SPLIT_SHIFTS_BP,
} from '../domain/budget-shifts.js';
import { BUDGET_SPLITS, type SplitBp } from '../domain/budget-splits.js';
import { SCALE_BANDS } from '../domain/scale.js';

function net(shift: SplitBp): number {
  return BUDGET_CATEGORIES.reduce((sum, category) => sum + (shift[category] ?? 0), 0);
}

const inside = (value: number, bounds: { min: number; max: number }): boolean =>
  value >= bounds.min && value <= bounds.max;

describe('budget shifts (BUD-02…08)', () => {
  it('scale and destination shifts move points without creating any', () => {
    for (const band of SCALE_BANDS) expect(net(SCALE_SPLIT_SHIFTS_BP[band])).toBe(0);
    expect(net(DESTINATION_SHIFT_BP)).toBe(0);
  });

  it('intimate and large shifts mirror each other and mid changes nothing', () => {
    for (const category of BUDGET_CATEGORIES) {
      const intimate = SCALE_SPLIT_SHIFTS_BP.intimate[category] ?? 0;
      const large = SCALE_SPLIT_SHIFTS_BP.large[category] ?? 0;
      expect(intimate + large).toBe(0);
    }
    expect(Object.keys(SCALE_SPLIT_SHIFTS_BP.mid)).toEqual([]);
  });

  it('no line goes below zero, even with a scale shift and the destination shift together', () => {
    const wedding = BUDGET_SPLITS.wedding.shares;
    for (const band of SCALE_BANDS) {
      const scale = SCALE_SPLIT_SHIFTS_BP[band];
      for (const category of BUDGET_CATEGORIES) {
        const shifted =
          (wedding[category] ?? 0) + (scale[category] ?? 0) + (DESTINATION_SHIFT_BP[category] ?? 0);
        expect(shifted).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('defaults sit inside their published ranges', () => {
    expect(inside(PLANNER_DEFAULT_BP, PLANNER_SHARE_BP)).toBe(true);
    expect(inside(OUTSTATION_ACCOMMODATION_DEFAULT_BP, OUTSTATION_ACCOMMODATION_BP)).toBe(true);
    expect(HOME_PARTY_VENUE_BP).toBeLessThan(BUDGET_SPLITS.birthday.shares.venue ?? 0);
    expect(PRIORITY_SHIFT_BP).toBeGreaterThan(0);
  });
});
