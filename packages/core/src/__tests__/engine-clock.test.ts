/**
 * Tests for engine/clock.ts — HH:MM arithmetic and the 10 pm–6 am outdoor sound ban.
 *
 * Responsibility: prove conversions round-trip, wrap around midnight both ways, and the
 * curfew boundaries match the Noise Rules constants. Boundary: unit tests.
 */
import { describe, expect, it } from 'vitest';
import { NOISE_CURFEW_END_HHMM, NOISE_CURFEW_START_HHMM } from '../domain/permissions.js';
import {
  addMinutes,
  fromMinutes,
  isInNoiseCurfew,
  runsIntoCurfew,
  toMinutes,
} from '../engine/clock.js';

describe('clock conversions', () => {
  it('round-trips every minute of the day', () => {
    for (let minute = 0; minute < 1_440; minute += 7) {
      expect(toMinutes(fromMinutes(minute))).toBe(minute);
    }
  });

  it('wraps past midnight in both directions', () => {
    expect(fromMinutes(-30)).toBe('23:30');
    expect(fromMinutes(1_440 + 75)).toBe('01:15');
    expect(addMinutes('23:30', 300)).toBe('04:30');
    expect(addMinutes('01:00', -180)).toBe('22:00');
  });

  it('reads malformed input as midnight', () => {
    expect(toMinutes('')).toBe(0);
  });
});

describe('noise curfew', () => {
  it('allows sound that stops exactly at the curfew start', () => {
    expect(isInNoiseCurfew(NOISE_CURFEW_START_HHMM)).toBe(false);
    expect(isInNoiseCurfew(addMinutes(NOISE_CURFEW_START_HHMM, 1))).toBe(true);
  });

  it('treats the early hours as curfew until the end time', () => {
    expect(isInNoiseCurfew(addMinutes(NOISE_CURFEW_END_HHMM, -1))).toBe(true);
    expect(isInNoiseCurfew(NOISE_CURFEW_END_HHMM)).toBe(false);
  });

  it('flags spans that run past 10 pm or start inside the ban', () => {
    expect(runsIntoCurfew('19:00', 4)).toBe(true);
    expect(runsIntoCurfew('18:00', 4)).toBe(false);
    expect(runsIntoCurfew('23:30', 5)).toBe(true);
    expect(runsIntoCurfew('07:00', 5)).toBe(false);
  });
});
