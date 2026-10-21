/**
 * Tests for domain/samples.ts: that samples stay valid and correctly dated for many todays.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { addMonthsIso, daysBetweenIso, isoMonth } from '../domain/calendar.js';
import { SAMPLE_CONTEXTS, SAMPLE_IDS, sampleContext, sampleDate } from '../domain/samples.js';
import { findCity } from '../domain/city-table.js';
import { eventContextSchema } from '../schemas/context.js';
import { isWithinPlanningWindow } from '../schemas/requests.js';

/** Several "todays", including a leap day and a year end, so samples never go stale. */
const TODAYS = ['2026-10-20', '2026-12-31', '2027-07-01', '2028-02-29', '2031-05-15'];

describe('sample contexts', () => {
  it('parse as valid contexts and fall inside the planning window for every today', () => {
    for (const today of TODAYS) {
      for (const id of SAMPLE_IDS) {
        const context = sampleContext(id, today);
        expect(eventContextSchema.safeParse(context).success).toBe(true);
        expect(isWithinPlanningWindow(context.dateIso, today)).toBe(true);
        expect(context.dateFlexible).toBe(false);
      }
    }
  });

  it('the wedding is dated a fixed number of months ahead', () => {
    const timing = SAMPLE_CONTEXTS['jaipur-wedding'].timing;
    const months = timing.kind === 'months-ahead' ? timing.months : 0;
    for (const today of TODAYS) {
      expect(sampleContext('jaipur-wedding', today).dateIso).toBe(addMonthsIso(today, months));
    }
  });

  it("the birthday falls in one of Bengaluru's wet months and the utsav in September, a month out", () => {
    const wetMonths = findCity(SAMPLE_CONTEXTS['bengaluru-birthday'].context.city)?.rainyMonths;
    for (const today of TODAYS) {
      const birthday = sampleContext('bengaluru-birthday', today).dateIso ?? '';
      const utsav = sampleContext('society-ganesh', today).dateIso ?? '';
      expect(wetMonths).toContain(isoMonth(birthday));
      expect(isoMonth(utsav)).toBe(9);
      for (const date of [birthday, utsav])
        expect(daysBetweenIso(today, date)).toBeGreaterThanOrEqual(30);
    }
  });

  it('a bad today gives an undated context rather than a wrong date', () => {
    const context = sampleContext('society-ganesh', 'not-a-date');
    expect(context.dateFlexible).toBe(true);
    expect(context.dateIso).toBeUndefined();
    expect(sampleDate({ kind: 'months-ahead', months: 1 }, 'nope')).toBeUndefined();
  });

  it('each persona is a different kind of event, covers wedding, birthday and community, and carries its extras', () => {
    const kinds = SAMPLE_IDS.map((id) => SAMPLE_CONTEXTS[id].context.kind);
    expect(new Set(kinds).size).toBe(SAMPLE_IDS.length);
    const families = new Set(SAMPLE_IDS.map((id) => SAMPLE_CONTEXTS[id].context.family));
    expect([...families].sort()).toEqual(['birthday', 'community', 'wedding']);
    expect(SAMPLE_CONTEXTS['bengaluru-birthday'].context.birthday?.age).toBe(7);
    expect(SAMPLE_CONTEXTS['chennai-60th'].context.birthday?.age).toBe(60);
    expect(SAMPLE_CONTEXTS['society-ganesh'].context.community?.premises).toBe('private');
  });
});
