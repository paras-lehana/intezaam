/**
 * Tests for domain/event-kinds.ts: kind defaults: family membership, functions, guests, age bands.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { EVENT_KIND_PROFILES, kindsOfFamily } from '../domain/event-kinds.js';
import { AGE_BANDS, EVENT_FAMILIES, EVENT_KINDS } from '../domain/events.js';
import { functionAllowedFor } from '../domain/functions.js';
import { isSourceId } from '../domain/sources.js';

describe('event kinds', () => {
  it('kindsOfFamily partitions every kind into exactly one family', () => {
    const grouped = EVENT_FAMILIES.flatMap((family) => kindsOfFamily(family));
    expect([...grouped].sort()).toEqual([...EVENT_KINDS].sort());
  });

  it('default functions fit the family and default guests sit in the typical range', () => {
    for (const kind of EVENT_KINDS) {
      const profile = EVENT_KIND_PROFILES[kind];
      expect(profile.defaultFunctions.length).toBeGreaterThan(0);
      for (const fn of profile.defaultFunctions)
        expect(functionAllowedFor(fn, profile.family)).toBe(true);
      if (profile.typicalGuests !== null) {
        expect(profile.defaultGuests).toBeGreaterThanOrEqual(profile.typicalGuests.min);
        expect(profile.defaultGuests).toBeLessThanOrEqual(profile.typicalGuests.max);
      }
      expect(isSourceId(profile.sourceId)).toBe(true);
    }
  });

  it('every birthday kind has an age band and no other kind does', () => {
    for (const kind of EVENT_KINDS) {
      const profile = EVENT_KIND_PROFILES[kind];
      if (profile.family === 'birthday') expect(AGE_BANDS).toContain(profile.ageBand);
      else expect(profile.ageBand).toBeNull();
    }
  });
});
