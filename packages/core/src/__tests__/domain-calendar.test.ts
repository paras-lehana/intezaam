/**
 * Tests for domain/calendar.ts: ISO date validation and arithmetic, including invalid input.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import {
  addDaysIso,
  addMonthsIso,
  daysBetweenIso,
  isoMonth,
  isoMonthKey,
  isoWeekday,
  isValidIsoDate,
  nextOccurrenceIso,
  parseIsoDate,
} from '../domain/calendar.js';

describe('parsing and validation', () => {
  it('accepts real dates and rejects impossible or malformed ones', () => {
    expect(parseIsoDate('2026-11-25')).toEqual({ year: 2026, month: 11, day: 25 });
    expect(isValidIsoDate('2028-02-29')).toBe(true);
    expect(isValidIsoDate('2027-02-29')).toBe(false);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
    expect(isValidIsoDate('25-11-2026')).toBe(false);
  });
});

describe('arithmetic', () => {
  it('adds days across month and year ends, both directions', () => {
    expect(addDaysIso('2026-10-20', 36)).toBe('2026-11-25');
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysIso('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('adds months and clamps to the end of a shorter month', () => {
    expect(addMonthsIso('2026-10-20', 4)).toBe('2027-02-20');
    expect(addMonthsIso('2026-10-31', 4)).toBe('2027-02-28');
    expect(addMonthsIso('2027-03-15', -3)).toBe('2026-12-15');
  });

  it('counts days between dates, negative when the second is earlier', () => {
    expect(daysBetweenIso('2026-10-20', '2026-11-25')).toBe(36);
    expect(daysBetweenIso('2026-11-25', '2026-10-20')).toBe(-36);
  });

  it('reads month, weekday and month key', () => {
    expect(isoMonth('2026-11-25')).toBe(11);
    expect(isoWeekday('2026-11-25')).toBe(new Date(Date.UTC(2026, 10, 25)).getUTCDay());
    expect(isoMonthKey('2026-11-25')).toBe('2026-11');
  });

  it('finds the next occurrence of a month and day', () => {
    expect(nextOccurrenceIso('2026-10-20', 7, 18)).toBe('2027-07-18');
    expect(nextOccurrenceIso('2026-07-18', 7, 18)).toBe('2026-07-18');
    expect(nextOccurrenceIso('2026-03-01', 2, 29)).toBe('2028-02-29');
    expect(nextOccurrenceIso('2026-03-01', 2, 30)).toBeUndefined();
  });
});

describe('invalid input never throws', () => {
  it('returns undefined instead', () => {
    expect(addDaysIso('nope', 1)).toBeUndefined();
    expect(addMonthsIso('2026-02-30', 1)).toBeUndefined();
    expect(daysBetweenIso('2026-10-20', 'x')).toBeUndefined();
    expect(isoMonth('x')).toBeUndefined();
    expect(isoWeekday('x')).toBeUndefined();
    expect(isoMonthKey('x')).toBeUndefined();
    expect(nextOccurrenceIso('x', 1, 1)).toBeUndefined();
  });
});
