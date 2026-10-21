/**
 * Tests for the brief date reader (research note 09 §5.2.2).
 *
 * Responsibility: explicit dates (with and without a year, "mai" rule, invalid days),
 * festival windows (after, before, around, on, disputed dates, ambiguous Eid, no curated
 * date), relative days and durations, relative weeks and months, and open dates. Boundary: festival
 * dates are read from the year-keyed table and relative dates from the calendar helpers.
 */
import { describe, expect, it } from 'vitest';
import { addDaysIso, addMonthsIso, isoMonth, isoWeekday } from '../domain/calendar.js';
import { readDate } from '../offline/parse-dates.js';
import { tokenise } from '../offline/tokens.js';
import { FESTIVAL_AFTER_DAYS, FESTIVAL_AROUND_DAYS } from '../offline/vocab/dates.js';
import { FESTIVAL_ANCHORS } from '../offline/vocab/festivals.js';

const TODAY = '2026-10-20';

function read(text: string, today = TODAY): ReturnType<typeof readDate> {
  return readDate(tokenise(text).tokens, today);
}

/** The month a window's middle day falls in, from the calendar helpers. */
function middleMonth(fromIso: string | undefined, days: number): number | undefined {
  const middle = fromIso === undefined ? undefined : addDaysIso(fromIso, Math.floor(days / 2));
  return middle === undefined ? undefined : isoMonth(middle);
}

describe('explicit dates', () => {
  it('reads day, month and year in either order', () => {
    expect(read('25 Nov 2026')).toMatchObject({
      dateIso: '2026-11-25',
      flexible: false,
      confirm: false,
      start: 0,
      end: 2,
    });
    expect(read('Nov 25')).toMatchObject({ dateIso: '2026-11-25' });
    expect(read('25th December')).toMatchObject({ dateIso: '2026-12-25' });
  });

  it('takes the next occurrence when no year is given', () => {
    expect(read('12 March')?.dateIso).toBe('2027-03-12');
  });

  it('keeps a month without a day as an open month', () => {
    expect(read('February 2027')).toMatchObject({ month: 2, flexible: true });
    expect(read('mai 2027')).toMatchObject({ month: 5, flexible: true });
  });

  it('reads "mai" to mean May only beside a day or a year', () => {
    expect(read('12 mai ko')?.dateIso).toBe('2027-05-12');
    expect(read('Jaipur mai shaadi')).toBeUndefined();
  });

  it('skips an impossible day instead of guessing', () => {
    expect(read('31 Feb 2027')).toBeUndefined();
  });
});

describe('festival dates', () => {
  const [diwali] = FESTIVAL_ANCHORS.diwali.dates[2026] ?? [];

  it('places "ke baad" in the month after the festival', () => {
    const from = diwali === undefined ? undefined : addDaysIso(diwali, 1);
    expect(read('Diwali ke baad')).toMatchObject({
      flexible: true,
      month: middleMonth(from, FESTIVAL_AFTER_DAYS - 1),
    });
  });

  it('places "se pehle" in the month before the festival', () => {
    const from = diwali === undefined ? undefined : addDaysIso(diwali, -FESTIVAL_AFTER_DAYS);
    expect(read('Diwali se pehle')).toMatchObject({
      month: middleMonth(from, FESTIVAL_AFTER_DAYS - 1),
    });
  });

  it('reads an English relation written before the festival ("before Diwali")', () => {
    const from = diwali === undefined ? undefined : addDaysIso(diwali, -FESTIVAL_AFTER_DAYS);
    expect(read('sometime before Diwali')).toMatchObject({
      month: middleMonth(from, FESTIVAL_AFTER_DAYS - 1),
      flexible: true,
    });
  });

  it('spans both disputed dates around a festival', () => {
    const [first, last] = FESTIVAL_ANCHORS.holi.dates[2027] ?? [];
    const from = first === undefined ? undefined : addDaysIso(first, -FESTIVAL_AROUND_DAYS);
    expect(last).toBeDefined();
    expect(read('Holi ke aas paas')).toMatchObject({
      month: middleMonth(from, 2 * FESTIVAL_AROUND_DAYS + 1),
    });
  });

  it('gives the exact day for "par" and a festival on today counts', () => {
    expect(read('Gurpurab par')?.dateIso).toBe(FESTIVAL_ANCHORS.gurpurab.dates[2026]?.[0]);
    // The 2026 Dussehra falls on TODAY: the window starts tomorrow, not after the 2027 one.
    expect(FESTIVAL_ANCHORS.dussehra.dates[2026]).toEqual([TODAY]);
    expect(read('Dussehra ke baad')?.month).toBe(
      middleMonth(addDaysIso(TODAY, 1), FESTIVAL_AFTER_DAYS - 1),
    );
  });

  it('asks instead of picking an Eid, and says nothing without a curated date', () => {
    expect(read('Eid ke baad')).toBeUndefined();
    expect(read('Diwali ke baad', '2031-01-01')).toBeUndefined();
  });
});

describe('relative and open dates', () => {
  it('reads aaj, kal and parson; kal and parson need a confirmation', () => {
    expect(read('aaj')).toMatchObject({ dateIso: TODAY, confirm: false });
    expect(read('kal shaam')).toMatchObject({ dateIso: addDaysIso(TODAY, 1), confirm: true });
    expect(read('parson')).toMatchObject({ dateIso: addDaysIso(TODAY, 2), confirm: true });
  });

  it('reads "N din/hafte/mahine baad" from today', () => {
    expect(read('do hafte baad')).toMatchObject({ dateIso: addDaysIso(TODAY, 14), confirm: true });
    expect(read('10 din baad')?.dateIso).toBe(addDaysIso(TODAY, 10));
    expect(read('2 mahine baad')?.dateIso).toBe(addMonthsIso(TODAY, 2));
    expect(read('hafte baad')).toBeUndefined();
    expect(read('3 hafte')).toBeUndefined();
  });

  it('reads this and next month as open months', () => {
    expect(read('agle mahine')).toMatchObject({
      month: isoMonth(addMonthsIso(TODAY, 1) ?? TODAY),
      flexible: true,
    });
    expect(read('is mahine')?.month).toBe(isoMonth(TODAY));
  });

  it('reads this and next week as Monday-to-Sunday windows', () => {
    const saturday = '2026-10-31';
    const sunday = addDaysIso(saturday, 1) ?? saturday;
    expect([isoWeekday(saturday), isoWeekday(sunday)]).toEqual([6, 0]);
    // Next week from a Saturday is the Monday two days on, through its Sunday.
    expect(read('agle hafte birthday', saturday)).toMatchObject({
      month: middleMonth(addDaysIso(saturday, 2), 6),
      flexible: true,
    });
    // On a Sunday, the rest of this week is today alone, so it is a date.
    expect(read('is hafte', sunday)).toMatchObject({ dateIso: sunday, flexible: false });
    expect(read('next week', TODAY)?.flexible).toBe(true);
  });

  it('keeps next year and seasons open with no month', () => {
    expect(read('agle saal')).toEqual({ start: 0, end: 1, flexible: true, confirm: false });
    expect(read('sardiyon mein')).toMatchObject({ flexible: true });
    expect(read('sardiyon mein')?.month).toBeUndefined();
    expect(read('shaadi 200 log')).toBeUndefined();
  });
});
