/**
 * Date reader for briefs: resolves what a brief says about the
 * date against `todayIso`.
 *
 * Responsibility: in order — an explicit day and month ("25 Nov 2026", "12 mai") → that
 * date (the next occurrence when no year is given); a festival with a relation ("Diwali ke
 * baad", "Gurpurab par") → the festival's window or day; "aaj/kal/parson" and "do hafte
 * baad" → a date the user confirms; "is/agle hafte" → that week's window; "agle mahine" or a
 * month name → that month; a season or
 * "agle saal" → date open. A disputed festival date widens the window instead of picking a
 * side, and plain "Eid" is ambiguous, so it is asked. Boundary: pure; never guesses.
 */
import {
  addDaysIso,
  addMonthsIso,
  daysBetweenIso,
  isoMonth,
  isoWeekday,
} from '../domain/calendar.js';
import { nextOccurrenceIso, parseIsoDate } from '../domain/calendar.js';
import { readNumberAt } from './number-phrases.js';
import { buildPhraseIndex, findPhrases, matchAt, tokenSet, type Token } from './tokens.js';
import {
  AFTER_DURATION_WORDS,
  AMBIGUOUS_MONTH_WORDS,
  DAYS_PER_WEEK,
  DURATION_UNITS,
  FESTIVAL_AFTER_DAYS,
  FESTIVAL_AROUND_DAYS,
  FESTIVAL_RELATION_PHRASES,
  MONTH_WORDS,
  NEXT_YEAR_PHRASES,
  RELATIVE_DAY_WORDS,
  RELATIVE_MONTH_PHRASES,
  RELATIVE_WEEK_PHRASES,
  SEASON_WORDS,
  WEEK_START_WEEKDAY,
  type FestivalRelation,
} from './vocab/dates.js';
import { FESTIVAL_ANCHORS, FESTIVAL_KEYS, type FestivalKey } from './vocab/festivals.js';
import { ORDINAL_SUFFIXES } from './vocab/numbers.js';
import { expandGroups, expandWordGroups } from './vocab/word-list.js';

export interface DateReading {
  /** Token span of the words that gave the date (the evidence quote). */
  readonly start: number;
  readonly end: number;
  readonly dateIso?: string;
  readonly month?: number;
  /** True when only a window, month or season is known ("not fixed yet"). */
  readonly flexible: boolean;
  /** "kal" and "N din baad": the form asks the user to confirm the computed date. */
  readonly confirm: boolean;
}

interface MonthWord {
  readonly month: number;
  /** "mai" and "may" are months only beside a day number or a year. */
  readonly ambiguous: boolean;
}

// Efficiency: every table is folded and indexed once at load.
const MONTHS = buildPhraseIndex<MonthWord>([
  ...expandWordGroups(MONTH_WORDS).map(
    ([word, month]) => [word, { month, ambiguous: false }] as const,
  ),
  ...expandWordGroups(AMBIGUOUS_MONTH_WORDS).map(
    ([word, month]) => [word, { month, ambiguous: true }] as const,
  ),
]);
const FESTIVALS = buildPhraseIndex(
  FESTIVAL_KEYS.flatMap((key) => expandGroups([[key, FESTIVAL_ANCHORS[key].names]])),
);
const RELATIONS = buildPhraseIndex(expandGroups(FESTIVAL_RELATION_PHRASES));
const RELATIVE_DAYS = buildPhraseIndex(expandGroups(RELATIVE_DAY_WORDS));
const RELATIVE_MONTHS = buildPhraseIndex(expandGroups(RELATIVE_MONTH_PHRASES));
const RELATIVE_WEEKS = buildPhraseIndex(expandGroups(RELATIVE_WEEK_PHRASES));
const OPEN_DATE = buildPhraseIndex([
  ...expandGroups(NEXT_YEAR_PHRASES),
  ...SEASON_WORDS.map((word) => [word, 0] as const),
]);
const UNITS = buildPhraseIndex(expandWordGroups(DURATION_UNITS));
const AFTER_DURATION = tokenSet(AFTER_DURATION_WORDS);
const ORDINAL = tokenSet(ORDINAL_SUFFIXES);

const DAY_NUMBER = /^\d{1,2}$/;
const YEAR_NUMBER = /^20\d{2}$/;
const ISO_PAD = 2;
const HALF = 2;

/** [from, to] offsets per relation: after = F+1…F+30, before = F−30…F−1, around = ±7, on = F. */
const RELATION_WINDOWS: Readonly<Record<FestivalRelation, readonly [number, number]>> = {
  after: [1, FESTIVAL_AFTER_DAYS],
  before: [-FESTIVAL_AFTER_DAYS, -1],
  around: [-FESTIVAL_AROUND_DAYS, FESTIVAL_AROUND_DAYS],
  on: [0, 0],
};

function textAt(tokens: readonly Token[], index: number): string {
  return tokens[index]?.text ?? '';
}

function numberAt(tokens: readonly Token[], index: number, pattern: RegExp): number | undefined {
  const text = textAt(tokens, index);
  return pattern.test(text) ? Number(text) : undefined;
}

function isoOf(year: number, month: number, day: number): string | undefined {
  const iso = `${year}-${String(month).padStart(ISO_PAD, '0')}-${String(day).padStart(ISO_PAD, '0')}`;
  return parseIsoDate(iso) === undefined ? undefined : iso;
}

/** "25 Nov 2026", "25th December", "12 mai", "Nov 25" or "February 2027". */
function explicitDate(tokens: readonly Token[], todayIso: string): DateReading | undefined {
  for (const { start: at, end: monthEnd, value } of findPhrases(tokens, MONTHS)) {
    const dayStart = at - 1 - (ORDINAL.has(textAt(tokens, at - 1)) ? 1 : 0);
    const dayBefore = numberAt(tokens, dayStart, DAY_NUMBER);
    const dayAfter =
      dayBefore === undefined ? numberAt(tokens, monthEnd + 1, DAY_NUMBER) : undefined;
    const yearAt = monthEnd + (dayAfter === undefined ? 1 : 2);
    const year = numberAt(tokens, yearAt, YEAR_NUMBER);
    const day = dayBefore ?? dayAfter;
    // "Jaipur mai" means "in Jaipur": an ambiguous month needs a day or a year beside it.
    if (value.ambiguous && day === undefined && year === undefined) continue;
    const start = dayBefore === undefined ? at : dayStart;
    const end = year === undefined ? monthEnd + (dayAfter === undefined ? 0 : 1) : yearAt;
    if (day === undefined)
      return { start, end, month: value.month, flexible: true, confirm: false };
    const dateIso =
      year === undefined
        ? nextOccurrenceIso(todayIso, value.month, day)
        : isoOf(year, value.month, day);
    if (dateIso !== undefined) return { start, end, dateIso, flexible: false, confirm: false };
  }
  return undefined;
}

/** The festival's candidate dates for its next occurrence on or after today (today counts). */
function nextFestivalDates(key: FestivalKey, todayIso: string): readonly string[] | undefined {
  const years = Object.entries(FESTIVAL_ANCHORS[key].dates).sort(
    ([a], [b]) => Number(a) - Number(b),
  );
  return years.map(([, dates]) => dates).find((dates) => dates.some((date) => date >= todayIso));
}

/** A one-day window is that date; a longer one gives the month of its middle day, date open. */
function windowReading(start: number, end: number, fromIso: string, toIso: string): DateReading {
  if (fromIso === toIso) return { start, end, dateIso: fromIso, flexible: false, confirm: false };
  const middle = addDaysIso(fromIso, Math.floor((daysBetweenIso(fromIso, toIso) ?? 0) / HALF));
  return { start, end, month: isoMonth(middle ?? fromIso) ?? 1, flexible: true, confirm: false };
}

function festivalDate(tokens: readonly Token[], todayIso: string): DateReading | undefined {
  for (const festival of findPhrases(tokens, FESTIVALS)) {
    if (FESTIVAL_ANCHORS[festival.value].ambiguous) continue;
    const dates = nextFestivalDates(festival.value, todayIso);
    if (dates === undefined) continue;
    const following = matchAt(tokens, festival.end + 1, RELATIONS);
    const preceding = matchAt(tokens, festival.start - 1, RELATIONS);
    const relation = following ?? (preceding?.end === festival.start - 1 ? preceding : undefined);
    const sorted = [...dates].sort();
    const first = sorted[0] ?? todayIso;
    const last = sorted[sorted.length - 1] ?? first;
    // A festival named without a relation is the occasion: its month, the day still open.
    const [fromOffset, toOffset] =
      relation === undefined ? [0, 1] : RELATION_WINDOWS[relation.value];
    const fromIso = addDaysIso(first, fromOffset) ?? first;
    const toIso = addDaysIso(last, toOffset) ?? last;
    const start = Math.min(festival.start, relation?.start ?? festival.start);
    const end = Math.max(festival.end, relation?.end ?? festival.end);
    return windowReading(start, end, fromIso, toIso);
  }
  return undefined;
}

/** aaj / kal / parson, and "do hafte baad" / "10 din baad" / "2 mahine baad". */
function relativeDate(tokens: readonly Token[], todayIso: string): DateReading | undefined {
  const [day] = findPhrases(tokens, RELATIVE_DAYS);
  if (day !== undefined) {
    const dateIso = addDaysIso(todayIso, day.value) ?? todayIso;
    return { start: day.start, end: day.end, dateIso, flexible: false, confirm: day.value !== 0 };
  }
  for (const unit of findPhrases(tokens, UNITS)) {
    if (!AFTER_DURATION.has(textAt(tokens, unit.end + 1))) continue;
    const count = readNumberAt(tokens, unit.start - 1);
    if (count === undefined || count.end !== unit.start - 1) continue;
    const dateIso =
      unit.value === 'month'
        ? addMonthsIso(todayIso, count.low)
        : addDaysIso(todayIso, unit.value === 'week' ? count.low * DAYS_PER_WEEK : count.low);
    return {
      start: count.start,
      end: unit.end + 1,
      dateIso: dateIso ?? todayIso,
      flexible: false,
      confirm: true,
    };
  }
  return undefined;
}

/** "is hafte" → today to Sunday; "agle hafte" → next Monday to Sunday, as a window. */
function relativeWeek(tokens: readonly Token[], todayIso: string): DateReading | undefined {
  const [match] = findPhrases(tokens, RELATIVE_WEEKS);
  const weekday = isoWeekday(todayIso);
  if (match === undefined || weekday === undefined) return undefined;
  const toMonday = (WEEK_START_WEEKDAY - weekday - DAYS_PER_WEEK) % DAYS_PER_WEEK;
  const monday = addDaysIso(todayIso, toMonday + match.value * DAYS_PER_WEEK) ?? todayIso;
  const fromIso = match.value === 0 ? todayIso : monday;
  const toIso = addDaysIso(monday, DAYS_PER_WEEK - 1) ?? monday;
  return windowReading(match.start, match.end, fromIso, toIso);
}

function relativeMonth(tokens: readonly Token[], todayIso: string): DateReading | undefined {
  const [match] = findPhrases(tokens, RELATIVE_MONTHS);
  if (match === undefined) return undefined;
  const month = isoMonth(addMonthsIso(todayIso, match.value) ?? todayIso) ?? 1;
  return { start: match.start, end: match.end, month, flexible: true, confirm: false };
}

function openDate(tokens: readonly Token[]): DateReading | undefined {
  const [match] = findPhrases(tokens, OPEN_DATE);
  return match === undefined
    ? undefined
    : { start: match.start, end: match.end, flexible: true, confirm: false };
}

/**
 * What the brief says about the date, resolved against today; undefined when it says nothing.
 * @example
 * readDate(tokenise('Diwali ke baad').tokens, '2026-10-20')?.month; // 11
 * readDate(tokenise('25 Nov 2026').tokens, '2026-10-20')?.dateIso; // '2026-11-25'
 */
export function readDate(tokens: readonly Token[], todayIso: string): DateReading | undefined {
  return (
    explicitDate(tokens, todayIso) ??
    festivalDate(tokens, todayIso) ??
    relativeDate(tokens, todayIso) ??
    relativeWeek(tokens, todayIso) ??
    relativeMonth(tokens, todayIso) ??
    openDate(tokens)
  );
}
