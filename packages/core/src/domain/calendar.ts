/**
 * Calendar arithmetic on ISO dates (YYYY-MM-DD), always in UTC.
 *
 * Responsibility: the small, pure date helpers the season tables, the sample contexts and
 * the engines share — validate, add days or months, count days between dates, read the
 * month and weekday. Boundary: no clock; callers pass `todayIso`. Invalid input never
 * throws: helpers return `undefined` so callers decide what an unusable date means.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;
/** JavaScript months are 0-based; ISO months are 1-based. */
const MONTH_OFFSET = 1;
const MONTHS_PER_YEAR = 12;
const PAD_WIDTH = 2;
const YEAR_WIDTH = 4;
/** Eight years always contain a leap year, so a 29 Feb target is still found. */
const OCCURRENCE_SEARCH_YEARS = 8;

/** A calendar day as integers (month 1–12). */
export interface IsoParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

/**
 * Splits a valid ISO date into numbers; rejects impossible dates such as 2027-02-29.
 * @example
 * parseIsoDate('2026-11-25'); // { year: 2026, month: 11, day: 25 }
 * parseIsoDate('2026-02-30'); // undefined
 */
export function parseIsoDate(iso: string): IsoParts | undefined {
  const match = ISO_DATE.exec(iso);
  if (match === null) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - MONTH_OFFSET, day));
  const sameDay =
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - MONTH_OFFSET &&
    probe.getUTCDate() === day;
  return sameDay ? { year, month, day } : undefined;
}

/**
 * True for a real calendar date in YYYY-MM-DD form.
 * @example
 * isValidIsoDate('2028-02-29'); // true (leap year)
 */
export function isValidIsoDate(iso: string): boolean {
  return parseIsoDate(iso) !== undefined;
}

function epochDay(parts: IsoParts): number {
  return Date.UTC(parts.year, parts.month - MONTH_OFFSET, parts.day) / MS_PER_DAY;
}

function fromEpochDay(day: number): string {
  const date = new Date(day * MS_PER_DAY);
  const year = String(date.getUTCFullYear()).padStart(YEAR_WIDTH, '0');
  const month = String(date.getUTCMonth() + MONTH_OFFSET).padStart(PAD_WIDTH, '0');
  const dayOfMonth = String(date.getUTCDate()).padStart(PAD_WIDTH, '0');
  return `${year}-${month}-${dayOfMonth}`;
}

/**
 * Adds (or, with a negative count, subtracts) whole days.
 * @example
 * addDaysIso('2026-10-20', 36); // '2026-11-25'
 */
export function addDaysIso(iso: string, days: number): string | undefined {
  const parts = parseIsoDate(iso);
  return parts === undefined ? undefined : fromEpochDay(epochDay(parts) + Math.trunc(days));
}

/**
 * Adds whole months, clamping to the last day of a shorter month (31 Jan + 1 → 28/29 Feb).
 * @example
 * addMonthsIso('2026-10-31', 4); // '2027-02-28'
 */
export function addMonthsIso(iso: string, months: number): string | undefined {
  const parts = parseIsoDate(iso);
  if (parts === undefined) return undefined;
  const monthIndex = parts.month - MONTH_OFFSET + Math.trunc(months);
  const year = parts.year + Math.floor(monthIndex / MONTHS_PER_YEAR);
  const month = (((monthIndex % MONTHS_PER_YEAR) + MONTHS_PER_YEAR) % MONTHS_PER_YEAR) + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return fromEpochDay(epochDay({ year, month, day: Math.min(parts.day, lastDay) }));
}

/**
 * Whole days from `fromIso` to `toIso` (negative when `toIso` is earlier).
 * @example
 * daysBetweenIso('2026-10-20', '2026-11-25'); // 36
 */
export function daysBetweenIso(fromIso: string, toIso: string): number | undefined {
  const from = parseIsoDate(fromIso);
  const to = parseIsoDate(toIso);
  return from === undefined || to === undefined ? undefined : epochDay(to) - epochDay(from);
}

/**
 * The month (1–12) of an ISO date.
 * @example
 * isoMonth('2026-11-25'); // 11
 */
export function isoMonth(iso: string): number | undefined {
  return parseIsoDate(iso)?.month;
}

/**
 * The weekday, 0 = Sunday … 6 = Saturday (the `Date#getUTCDay` convention).
 * @example
 * isoWeekday('2026-11-25'); // 3 (a Wednesday)
 */
export function isoWeekday(iso: string): number | undefined {
  const parts = parseIsoDate(iso);
  return parts === undefined ? undefined : new Date(epochDay(parts) * MS_PER_DAY).getUTCDay();
}

/**
 * The calendar month key used by cash-flow rows.
 * @example
 * isoMonthKey('2026-11-25'); // '2026-11'
 */
export function isoMonthKey(iso: string): string | undefined {
  return parseIsoDate(iso) === undefined ? undefined : iso.slice(0, YEAR_WIDTH + 1 + PAD_WIDTH);
}

/**
 * The next date on or after `fromIso` that falls on the given month and day; a 29 Feb
 * target moves to the next leap year.
 * @example
 * nextOccurrenceIso('2026-10-20', 7, 18); // '2027-07-18'
 */
export function nextOccurrenceIso(fromIso: string, month: number, day: number): string | undefined {
  const from = parseIsoDate(fromIso);
  if (from === undefined) return undefined;
  const pad = (value: number): string => String(value).padStart(PAD_WIDTH, '0');
  for (let offset = 0; offset <= OCCURRENCE_SEARCH_YEARS; offset += 1) {
    const candidate = `${String(from.year + offset).padStart(YEAR_WIDTH, '0')}-${pad(month)}-${pad(day)}`;
    const gap = daysBetweenIso(fromIso, candidate);
    if (gap !== undefined && gap >= 0) return candidate;
  }
  return undefined;
}
