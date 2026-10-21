/**
 * Tests for domain/community-occasions.ts: the thirteen community occasion rows.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import {
  COMMUNITY_OCCASION_PROFILES,
  COMMUNITY_OCCASIONS,
  occasionKind,
  type OccasionDates,
} from '../domain/community-occasions.js';
import { kindsOfFamily } from '../domain/event-kinds.js';
import { FESTIVAL_DATES } from '../domain/festivals.js';
import { RULE_IDS } from '../domain/rule-ids.js';
import { isSourceId } from '../domain/sources.js';

const COMMUNITY_KINDS = kindsOfFamily('community');

/** v1 ships thirteen community occasion rows. */
const OCCASION_COUNT = 13;
const MONTH_DAY = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function datesOf(dates: OccasionDates): readonly string[] {
  if (dates.basis === 'fixed') return dates.monthDays;
  if (dates.basis === 'user-picks') return [];
  return dates.festivalIds.flatMap((id) => FESTIVAL_DATES[id].datesIso);
}

describe('community occasions', () => {
  it('has thirteen rows, each planned as a community kind', () => {
    expect(COMMUNITY_OCCASIONS).toHaveLength(OCCASION_COUNT);
    for (const occasion of COMMUNITY_OCCASIONS) {
      expect(COMMUNITY_KINDS).toContain(occasionKind(occasion));
    }
  });

  it('spans every community kind and more than one faith and civic day', () => {
    const kinds = new Set(COMMUNITY_OCCASIONS.map(occasionKind));
    expect([...kinds].sort()).toEqual([...COMMUNITY_KINDS].sort());
    for (const occasion of ['eid-milan', 'christmas', 'gurpurab', 'onam', 'national-day'] as const)
      expect(COMMUNITY_OCCASIONS).toContain(occasion);
  });

  it('cites registered sources and known rules, with both labels filled', () => {
    for (const occasion of COMMUNITY_OCCASIONS) {
      const profile = COMMUNITY_OCCASION_PROFILES[occasion];
      expect(profile.label.length).toBeGreaterThan(0);
      expect(profile.labelHi).toMatch(/\p{Script=Devanagari}/u);
      expect(profile.sourceIds.length).toBeGreaterThan(0);
      for (const sourceId of profile.sourceIds) expect(isSourceId(sourceId)).toBe(true);
      for (const ruleId of profile.ruleIds) expect(RULE_IDS).toContain(ruleId);
    }
  });

  it('dates festival occasions from curated rows, fixed days by month-day, and the rest by choice', () => {
    for (const occasion of COMMUNITY_OCCASIONS) {
      const { dates } = COMMUNITY_OCCASION_PROFILES[occasion];
      if (dates.basis === 'user-picks') expect(datesOf(dates)).toEqual([]);
      else expect(datesOf(dates).length).toBeGreaterThan(0);
      if (dates.basis === 'fixed')
        for (const day of dates.monthDays) expect(day).toMatch(MONTH_DAY);
    }
  });

  it('keeps a moon-dated Eid Milan open after either Eid', () => {
    const { dates } = COMMUNITY_OCCASION_PROFILES['eid-milan'];
    expect(dates.basis).toBe('after-festival');
    expect(datesOf(dates)).toEqual([
      ...FESTIVAL_DATES['eid-al-fitr-2027'].datesIso,
      ...FESTIVAL_DATES['eid-al-adha-2027'].datesIso,
    ]);
  });

  it('carries the occasion-specific permission rules', () => {
    expect(COMMUNITY_OCCASION_PROFILES['ganesh-utsav'].ruleIds).toContain('PERM-05');
    expect(COMMUNITY_OCCASION_PROFILES['diwali-mela'].ruleIds).toContain('PERM-07');
    expect(COMMUNITY_OCCASION_PROFILES.gurpurab.ruleIds).toContain('PERM-05');
  });
});
