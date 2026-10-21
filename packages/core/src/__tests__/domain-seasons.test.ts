/**
 * Tests for domain/seasons.ts: season months, the off-peak factor and calendar pauses.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { isValidIsoDate } from '../domain/calendar.js';
import {
  CALENDAR_PAUSE_IDS,
  CALENDAR_PAUSES,
  DISCOUNT_WEEKDAYS,
  OFF_PEAK_MONTHS,
  OFF_PEAK_PRICE_FACTOR,
  OFF_PEAK_SAVING_PCT,
  PEAK_BOOKING_LEAD_MONTHS,
  PEAK_MONTHS,
  NE_MONSOON_MONTHS,
  pausesOn,
  SW_MONSOON_MONTHS,
  WET_PATTERN_INFO,
  WET_PATTERNS,
} from '../domain/seasons.js';
import { isSourceId } from '../domain/sources.js';

const PERCENT = 100;

describe('seasons (CTX-04, DATE-01)', () => {
  it('peak and off-peak months do not overlap', () => {
    for (const month of OFF_PEAK_MONTHS) expect(PEAK_MONTHS).not.toContain(month);
  });

  it('the off-peak factor takes the low end of the published saving', () => {
    expect(OFF_PEAK_SAVING_PCT.min).toBeLessThan(OFF_PEAK_SAVING_PCT.max);
    expect((1 - OFF_PEAK_PRICE_FACTOR) * PERCENT).toBeCloseTo(OFF_PEAK_SAVING_PCT.min);
  });

  it('peak-season booking lead is an ordered range of months', () => {
    expect(PEAK_BOOKING_LEAD_MONTHS.min).toBeLessThan(PEAK_BOOKING_LEAD_MONTHS.max);
  });

  it('weekdays are Monday to Thursday and the monsoon is June to September', () => {
    expect([...DISCOUNT_WEEKDAYS]).toEqual([1, 2, 3, 4]);
    expect([...SW_MONSOON_MONTHS]).toEqual([6, 7, 8, 9]);
  });
});

describe('wet patterns (CTX-07)', () => {
  it('every pattern starts from the southwest monsoon and cites registered sources', () => {
    for (const pattern of WET_PATTERNS) {
      const info = WET_PATTERN_INFO[pattern];
      for (const month of SW_MONSOON_MONTHS) expect(info.months).toContain(month);
      expect(new Set(info.months).size).toBe(info.months.length);
      expect(info.sourceIds).toContain('S-IMD-2020');
      for (const sourceId of info.sourceIds) expect(isSourceId(sourceId)).toBe(true);
    }
  });

  it('adds the whole northeast season where it applies, and only October for Bengaluru', () => {
    expect(WET_PATTERN_INFO['southwest-and-northeast'].months).toEqual([
      ...SW_MONSOON_MONTHS,
      ...NE_MONSOON_MONTHS,
    ]);
    const extra = WET_PATTERN_INFO.bengaluru.months.filter(
      (month) => !SW_MONSOON_MONTHS.includes(month),
    );
    expect(extra).toEqual([NE_MONSOON_MONTHS[0]]);
    expect(WET_PATTERN_INFO.bengaluru.sourceIds).toContain('S-CITIZENMATTERS-2016');
  });
});

describe('calendar pauses (DATE-03)', () => {
  it('are valid, ordered windows with registered sources', () => {
    for (const id of CALENDAR_PAUSE_IDS) {
      const pause = CALENDAR_PAUSES[id];
      expect(isValidIsoDate(pause.startIso) && isValidIsoDate(pause.endIso)).toBe(true);
      expect(pause.startIso < pause.endIso).toBe(true);
      for (const sourceId of pause.sourceIds) expect(isSourceId(sourceId)).toBe(true);
    }
  });

  it('finds the pause that contains a date, inclusive of both edges', () => {
    const chaturmas = CALENDAR_PAUSES['chaturmas-2026'];
    expect(pausesOn(chaturmas.startIso)).toEqual(['chaturmas-2026']);
    expect(pausesOn(chaturmas.endIso)).toEqual(['chaturmas-2026']);
    expect(pausesOn('2026-12-20')).toEqual(['kharmas-2026-winter']);
    expect(pausesOn('2026-11-25')).toEqual([]);
  });
});
