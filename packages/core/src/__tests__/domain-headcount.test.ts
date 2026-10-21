/**
 * Tests for domain/headcount.ts: attendance rates and plate factors.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import {
  ATTENDANCE_DESTINATION,
  ATTENDANCE_IN_TOWN,
  COOK_FOR_FACTOR,
  GUESTS_PER_ROOM,
  NO_SHOW_OF_CONFIRMED,
  PLATE_GUARANTEE_FACTOR,
  RETURN_GIFT_BUFFER_PCT,
  WASTE_WARNING_FACTOR,
} from '../domain/headcount.js';

describe('headcount constants (HC-01…03)', () => {
  it('default attendance rates sit inside their ranges and destinations draw fewer guests', () => {
    for (const rate of [ATTENDANCE_IN_TOWN, ATTENDANCE_DESTINATION]) {
      expect(rate.value).toBeGreaterThanOrEqual(rate.range.min);
      expect(rate.value).toBeLessThanOrEqual(rate.range.max);
    }
    expect(ATTENDANCE_DESTINATION.value).toBeLessThan(ATTENDANCE_IN_TOWN.value);
  });

  it('plate guarantee < expected < cook-for < waste warning', () => {
    expect(PLATE_GUARANTEE_FACTOR).toBeLessThan(1);
    expect(COOK_FOR_FACTOR).toBeGreaterThan(1);
    expect(WASTE_WARNING_FACTOR).toBeGreaterThan(COOK_FOR_FACTOR);
  });

  it('no-show share, rooms and the return-gift buffer are sane', () => {
    expect(NO_SHOW_OF_CONFIRMED).toBeGreaterThan(0);
    expect(NO_SHOW_OF_CONFIRMED).toBeLessThan(1 - ATTENDANCE_IN_TOWN.value);
    expect(GUESTS_PER_ROOM).toBeGreaterThan(1);
    expect(RETURN_GIFT_BUFFER_PCT.min).toBeLessThan(RETURN_GIFT_BUFFER_PCT.max);
  });
});
