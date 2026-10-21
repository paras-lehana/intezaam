/**
 * Tests for the festival anchors the brief reader resolves dates from.
 *
 * Responsibility: one source per fact — every date the domain festival table curates
 * appears in the anchors exactly as it is there, and every domain festival is reachable by
 * name; anchor dates are sorted, unique and filed under their own year; plain "Eid" is the
 * only ambiguous name; Eid Milan has no curated date. Boundary: data checks only.
 */
import { describe, expect, it } from 'vitest';
import { occasionKind } from '../domain/community-occasions.js';
import { FESTIVAL_DATES, FESTIVAL_IDS } from '../domain/festivals.js';
import { FESTIVAL_ANCHORS, FESTIVAL_KEYS } from '../offline/vocab/festivals.js';

const YEAR_DIGITS = 4;

describe('FESTIVAL_ANCHORS', () => {
  const allAnchorDates = new Set(
    FESTIVAL_KEYS.flatMap((key) => Object.values(FESTIVAL_ANCHORS[key].dates).flat()),
  );

  it('takes every curated domain date as it is', () => {
    for (const id of FESTIVAL_IDS) {
      for (const iso of FESTIVAL_DATES[id].datesIso)
        expect(allAnchorDates.has(iso), `${id} ${iso}`).toBe(true);
    }
    expect(FESTIVAL_ANCHORS.holi.dates[2027]).toEqual(FESTIVAL_DATES['holi-2027'].datesIso);
    expect(FESTIVAL_ANCHORS.diwali.dates[2027]).toEqual(FESTIVAL_DATES['diwali-2027'].datesIso);
  });

  it('files each date under its own year, sorted and once', () => {
    for (const key of FESTIVAL_KEYS) {
      for (const [year, dates] of Object.entries(FESTIVAL_ANCHORS[key].dates)) {
        for (const iso of dates) expect(iso.slice(0, YEAR_DIGITS)).toBe(year);
        expect([...dates].sort()).toEqual(dates);
        expect(new Set(dates).size).toBe(dates.length);
      }
    }
  });

  it("plans each festival that is a community occasion as that occasion's kind", () => {
    expect(FESTIVAL_ANCHORS['ganesh-chaturthi'].communityKind).toBe(occasionKind('ganesh-utsav'));
    expect(FESTIVAL_ANCHORS['durga-puja'].communityKind).toBe(occasionKind('durga-puja'));
    expect(FESTIVAL_ANCHORS.christmas.communityKind).toBe(occasionKind('christmas'));
    expect(FESTIVAL_ANCHORS['republic-day'].communityKind).toBe(occasionKind('national-day'));
    for (const key of ['eid', 'eid-ul-fitr', 'eid-ul-adha', 'eid-milan'] as const)
      expect(FESTIVAL_ANCHORS[key].communityKind).toBe(occasionKind('eid-milan'));
  });

  it('marks only plain Eid as ambiguous and leaves Eid Milan undated', () => {
    expect(FESTIVAL_KEYS.filter((key) => FESTIVAL_ANCHORS[key].ambiguous)).toEqual(['eid']);
    expect(FESTIVAL_ANCHORS['eid-milan'].dates).toEqual({});
  });

  it('gives every festival at least one spelling', () => {
    for (const key of FESTIVAL_KEYS)
      expect(FESTIVAL_ANCHORS[key].names.split('|').length).toBeGreaterThan(0);
  });
});
