/**
 * Tests for domain/space.ts: space per guest and the capacity formula.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { isSourceId } from '../domain/sources.js';
import {
  layoutCapacity,
  SPACE_LAYOUT_PROFILES,
  SPACE_LAYOUTS,
  USABLE_FLOOR_SHARE,
} from '../domain/space.js';

const AREA_SQFT = 3_000;

describe('space per guest (SPACE-01)', () => {
  it('each default sits inside its published range', () => {
    for (const layout of SPACE_LAYOUTS) {
      const profile = SPACE_LAYOUT_PROFILES[layout];
      expect(profile.defaultSqftPerGuest).toBeGreaterThanOrEqual(profile.sqftPerGuest.min);
      expect(profile.defaultSqftPerGuest).toBeLessThanOrEqual(profile.sqftPerGuest.max);
      expect(isSourceId(profile.sourceId)).toBe(true);
    }
  });

  it('capacity is floor(area × usable share ÷ sq ft per guest)', () => {
    for (const layout of SPACE_LAYOUTS) {
      const perGuest = SPACE_LAYOUT_PROFILES[layout].defaultSqftPerGuest;
      expect(layoutCapacity(AREA_SQFT, layout)).toBe(
        Math.floor((AREA_SQFT * USABLE_FLOOR_SHARE) / perGuest),
      );
    }
  });

  it('standing holds more people than seated rounds in the same hall', () => {
    expect(layoutCapacity(AREA_SQFT, 'standing')).toBeGreaterThan(
      layoutCapacity(AREA_SQFT, 'banquet-rounds'),
    );
  });
});
