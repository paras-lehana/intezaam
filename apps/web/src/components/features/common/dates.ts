/**
 * Calendar dates the way Indian readers write them ("Sat, 20 Feb, 2027", "February 2027").
 *
 * Responsibility: display formatting for the plan's ISO days (YYYY-MM-DD) and cash-flow
 * months (YYYY-MM). Boundary: display only. Dates are formatted in UTC because an ISO day
 * has no time zone: formatting it in the reader's zone could shift it by a day.
 */

const DAY = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const MONTH_YEAR = new Intl.DateTimeFormat('en-IN', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const MONTH = new Intl.DateTimeFormat('en-IN', { month: 'long', timeZone: 'UTC' });

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_MONTH = /^(\d{4})-(\d{2})$/;

/** A year that formats any month name (2001 is not a leap year, which day 1 never needs). */
const ANY_YEAR = 2001;

function utcDate(year: string, month: string, day: string): Date {
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

/**
 * An ISO day as "Sat, 20 Feb, 2027"; anything else is returned unchanged.
 * @example
 * formatIsoDate('2027-02-20'); // 'Sat, 20 Feb, 2027'
 */
export function formatIsoDate(iso: string): string {
  const match = ISO_DAY.exec(iso);
  if (match === null) return iso;
  const [, year = '', month = '', day = ''] = match;
  return DAY.format(utcDate(year, month, day));
}

/**
 * A cash-flow month key as "February 2027"; anything else is returned unchanged.
 * @example
 * formatMonthKey('2027-02'); // 'February 2027'
 */
export function formatMonthKey(key: string): string {
  const match = ISO_MONTH.exec(key);
  if (match === null) return key;
  const [, year = '', month = ''] = match;
  return MONTH_YEAR.format(utcDate(year, month, '1'));
}

/**
 * A month number (1–12) as its English name.
 * @example
 * monthName(12); // 'December'
 */
export function monthName(month: number): string {
  return MONTH.format(new Date(Date.UTC(ANY_YEAR, month - 1, 1)));
}
