/**
 * Tests for domain/community.ts: contribution weights and volunteer roles.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import {
  ATTENDEES_PER_MARSHAL,
  CONTRIBUTION_ROUNDING_INR,
  FLAT_SIZE_WEIGHTS,
  FLAT_SIZES,
  SPONSOR_IDEAS,
  VOLUNTEER_ROLE_INFO,
  VOLUNTEER_ROLES,
} from '../domain/community.js';
import { isSourceId } from '../domain/sources.js';

describe('community toolkit (COM-01…05)', () => {
  it('flat-size weights rise with flat size and the medium flat pays the base share', () => {
    const weights = FLAT_SIZES.map((size) => FLAT_SIZE_WEIGHTS[size]);
    expect(weights).toEqual([...weights].sort((a, b) => a - b));
    expect(FLAT_SIZE_WEIGHTS.medium).toBe(1);
  });

  it('only crowd marshals scale with attendance, one per 100 people', () => {
    for (const role of VOLUNTEER_ROLES) {
      const info = VOLUNTEER_ROLE_INFO[role];
      const expected = role === 'crowd-marshal' ? ATTENDEES_PER_MARSHAL : null;
      expect(info.attendeesPerVolunteer).toBe(expected);
      expect(isSourceId(info.sourceId)).toBe(true);
    }
  });

  it('rounds contributions to whole tens and offers sponsor ideas', () => {
    expect(CONTRIBUTION_ROUNDING_INR).toBe(10);
    expect(SPONSOR_IDEAS.length).toBeGreaterThan(0);
  });
});
