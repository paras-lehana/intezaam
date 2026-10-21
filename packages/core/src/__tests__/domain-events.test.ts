/**
 * Tests for domain/events.ts: family planning limits (minimum lead, contingency floor, overrun).
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { EVENT_FAMILIES, FAMILY_PROFILES } from '../domain/events.js';
import { isSourceId } from '../domain/sources.js';

describe('event families', () => {
  it('every family has labels, a positive minimum lead and a non-zero contingency floor', () => {
    for (const family of EVENT_FAMILIES) {
      const profile = FAMILY_PROFILES[family];
      expect(profile.label.length).toBeGreaterThan(0);
      expect(profile.labelHi.length).toBeGreaterThan(0);
      expect(profile.minWorkableLeadDays).toBeGreaterThan(0);
      expect(profile.contingencyFloorBp).toBeGreaterThan(0);
      for (const sourceId of profile.sourceIds) expect(isSourceId(sourceId)).toBe(true);
    }
  });

  it('weddings need the longest minimum lead and birthdays the shortest (VER-T)', () => {
    const leads = EVENT_FAMILIES.map((family) => FAMILY_PROFILES[family].minWorkableLeadDays);
    expect(FAMILY_PROFILES.wedding.minWorkableLeadDays).toBe(Math.max(...leads));
    expect(FAMILY_PROFILES.birthday.minWorkableLeadDays).toBe(Math.min(...leads));
  });

  it('overrun ranges, where stated, are ordered', () => {
    for (const family of EVENT_FAMILIES) {
      const overrun = FAMILY_PROFILES[family].overrunPct;
      if (overrun !== null) expect(overrun.min).toBeLessThanOrEqual(overrun.max);
    }
  });
});
