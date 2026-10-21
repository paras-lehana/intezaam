/**
 * Tests for domain/functions.ts: function profiles: times, weights, guest shares, vendors.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { MEAL_TYPES } from '../domain/catering.js';
import {
  FUNCTION_KINDS,
  FUNCTION_PROFILES,
  functionAllowedFor,
  OTHER_FUNCTION_KINDS,
  WEDDING_FUNCTION_KINDS,
} from '../domain/functions.js';
import { isSourceId } from '../domain/sources.js';
import { SPACE_LAYOUTS } from '../domain/space.js';
import { VENDOR_TYPES } from '../domain/vendors.js';
import { hhmmSchema } from '../schemas/common.js';

const HOURS_PER_DAY = 24;

describe('function kinds', () => {
  it('are the wedding functions followed by the rest, with no duplicates', () => {
    expect(FUNCTION_KINDS).toEqual([...WEDDING_FUNCTION_KINDS, ...OTHER_FUNCTION_KINDS]);
    expect(new Set(FUNCTION_KINDS).size).toBe(FUNCTION_KINDS.length);
  });
});

describe('function profiles', () => {
  it('have a valid start time, duration, weight, guest share, meal and layout', () => {
    for (const kind of FUNCTION_KINDS) {
      const profile = FUNCTION_PROFILES[kind];
      expect(hhmmSchema.safeParse(profile.defaultStartHhmm).success).toBe(true);
      expect(profile.durationHours).toBeGreaterThan(0);
      expect(profile.durationHours).toBeLessThan(HOURS_PER_DAY);
      expect(profile.weight).toBeGreaterThan(0);
      expect(profile.guestShare).toBeGreaterThan(0);
      expect(profile.guestShare).toBeLessThanOrEqual(1);
      expect(MEAL_TYPES).toContain(profile.meal);
      expect(SPACE_LAYOUTS).toContain(profile.layout);
      expect(profile.families.length).toBeGreaterThan(0);
    }
  });

  it('only name known vendors and registered sources', () => {
    for (const kind of FUNCTION_KINDS) {
      const profile = FUNCTION_PROFILES[kind];
      for (const vendor of profile.vendors) expect(VENDOR_TYPES).toContain(vendor);
      for (const sourceId of profile.sourceIds) expect(isSourceId(sourceId)).toBe(true);
    }
  });

  it('the main wedding ceremony carries the largest weight and every invited guest', () => {
    const weights = FUNCTION_KINDS.map((kind) => FUNCTION_PROFILES[kind].weight);
    expect(FUNCTION_PROFILES.wedding.weight).toBe(Math.max(...weights));
    expect(FUNCTION_PROFILES.wedding.guestShare).toBe(1);
  });

  it('places visarjan on the last day and pre-wedding functions before day 0', () => {
    expect(FUNCTION_PROFILES.visarjan.onLastDay).toBe(true);
    for (const kind of ['roka', 'engagement', 'haldi', 'mehendi', 'sangeet'] as const) {
      expect(FUNCTION_PROFILES[kind].dayOffset).toBeLessThan(0);
    }
  });

  it('functionAllowedFor follows the families list', () => {
    expect(functionAllowedFor('sangeet', 'wedding')).toBe(true);
    expect(functionAllowedFor('sangeet', 'birthday')).toBe(false);
    expect(functionAllowedFor('puja', 'community')).toBe(true);
  });
});
