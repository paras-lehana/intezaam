/**
 * Tests for domain/festivals.ts and domain/muhurat.ts: curated muhurat and festival dates with their sources.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { isValidIsoDate } from '../domain/calendar.js';
import {
  FESTIVAL_DATES,
  FESTIVAL_IDS,
  isMuhuratCurated,
  MUHURAT_CURATED_FROM_ISO,
  MUHURAT_CURATED_TO_ISO,
  MUHURAT_DATES,
  muhuratOn,
} from '../domain/festivals.js';
import { CALENDAR_PAUSE_IDS, CALENDAR_PAUSES, pausesOn } from '../domain/seasons.js';
import { isSourceId, SOURCES } from '../domain/sources.js';

/** Dates every 2026 source lists. */
const AGREED_2026 = ['2026-11-21', '2026-11-24', '2026-11-25', '2026-11-26'];

/** Months the research found empty in 2027 (Chaturmas, the Sun in Simha and Kanya, combust planets). */
const EMPTY_MONTHS_2027 = ['2027-08', '2027-09', '2027-10'];

describe('curated muhurat dates (DATE-02)', () => {
  it('are unique, sorted, inside the curated range and cite registered sources', () => {
    const dates = MUHURAT_DATES.map((entry) => entry.dateIso);
    expect(dates).toEqual([...new Set(dates)].sort());
    for (const entry of MUHURAT_DATES) {
      expect(isValidIsoDate(entry.dateIso)).toBe(true);
      expect(isMuhuratCurated(entry.dateIso)).toBe(true);
      expect(entry.sourceIds.length).toBeGreaterThan(0);
      for (const sourceId of entry.sourceIds) expect(isSourceId(sourceId)).toBe(true);
    }
  });

  it('agreed dates cite Drik Panchang plus at least one other source; disputed dates explain the dispute', () => {
    for (const date of AGREED_2026) expect(muhuratOn(date)?.sourceIds.length).toBeGreaterThan(1);
    for (const entry of MUHURAT_DATES) {
      const cites = (publisher: string): boolean =>
        entry.sourceIds.some((id) => SOURCES[id].publisher === publisher);
      if (entry.conflict === undefined) {
        expect(cites('Drik Panchang')).toBe(true);
        expect(entry.sourceIds.length).toBeGreaterThan(1);
      } else {
        expect(entry.conflict.length).toBeGreaterThan(0);
      }
    }
  });

  it('cover 2027 month by month, with no dates in the paused months', () => {
    const in2027 = MUHURAT_DATES.filter((entry) => entry.dateIso.startsWith('2027-'));
    expect(in2027.length).toBeGreaterThan(0);
    for (const month of EMPTY_MONTHS_2027)
      expect(in2027.some((e) => e.dateIso.startsWith(month))).toBe(false);
  });

  it('no curated date falls in a calendar pause', () => {
    for (const entry of MUHURAT_DATES) expect(pausesOn(entry.dateIso)).toEqual([]);
  });

  it('knows which dates are outside the curated range', () => {
    expect(isMuhuratCurated(MUHURAT_CURATED_FROM_ISO)).toBe(true);
    expect(isMuhuratCurated(MUHURAT_CURATED_TO_ISO)).toBe(true);
    expect(isMuhuratCurated('2028-02-14')).toBe(false);
    expect(muhuratOn('2026-11-22')).toBeUndefined();
  });
});

describe('calendar pauses (DATE-03)', () => {
  it('every pause is a valid, ordered range with registered sources, and the 2027 Chaturmas is covered', () => {
    for (const id of CALENDAR_PAUSE_IDS) {
      const pause = CALENDAR_PAUSES[id];
      expect(isValidIsoDate(pause.startIso) && isValidIsoDate(pause.endIso)).toBe(true);
      expect(pause.startIso <= pause.endIso).toBe(true);
      for (const sourceId of pause.sourceIds) expect(isSourceId(sourceId)).toBe(true);
    }
    expect(pausesOn('2027-08-15')).toContain('chaturmas-2027');
    expect(pausesOn('2027-12-25')).toContain('kharmas-2027-winter');
  });
});

describe('festival dates (DATE-05)', () => {
  it('every festival has valid candidate dates and registered sources', () => {
    for (const id of FESTIVAL_IDS) {
      const festival = FESTIVAL_DATES[id];
      expect(festival.datesIso.length).toBeGreaterThan(0);
      for (const date of festival.datesIso) expect(isValidIsoDate(date)).toBe(true);
      for (const sourceId of festival.sourceIds) expect(isSourceId(sourceId)).toBe(true);
    }
  });

  it('festivals with conflicting sources keep every candidate date; settled ones keep one', () => {
    for (const id of [
      'holi-2027',
      'makar-sankranti-2027',
      'eid-al-fitr-2027',
      'gurpurab-2027',
    ] as const) {
      expect(FESTIVAL_DATES[id].datesIso.length).toBeGreaterThan(1);
    }
    expect(FESTIVAL_DATES['ganesh-chaturthi-2027'].datesIso).toHaveLength(1);
    expect(FESTIVAL_DATES['diwali-2027'].datesIso).toHaveLength(1);
  });

  it('lists festivals in date order, with the 2026 holiday order behind the rest of 2026', () => {
    const firstDates = FESTIVAL_IDS.map((id) => FESTIVAL_DATES[id].datesIso[0] ?? '');
    expect([...firstDates].sort()).toEqual(firstDates);
    for (const id of FESTIVAL_IDS.filter((festival) => festival.endsWith('2026'))) {
      expect(FESTIVAL_DATES[id].sourceIds).toContain('S-DOPT-2026');
      expect(FESTIVAL_DATES[id].confidence).toBe('A');
    }
  });
});
