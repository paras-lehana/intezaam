/**
 * Date vocabulary for the offline brief reader.
 *
 * Responsibility: month names in English, Hinglish and Devanagari; relative words (aaj, kal,
 * agle hafte, agle mahine, agle saal, "N din/hafte/mahine baad"); seasons; and the words that place an
 * event before, after, around or on a festival. A month part ("Dec ke end") keeps the month
 * open, because the draft holds a month, not a day window. Boundary: data only (spellings
 * are ours, grade D unless noted); resolution against `todayIso` lives in offline/parse-dates.ts.
 */
import { words, type PhraseGroups, type WordGroups } from './word-list.js';

/**
 * Month spellings. Romanised "mai" is also the common misspelling of "mein" (in), so it is
 * a month only next to a day number or a year ("the mai rule").
 */
export const MONTH_WORDS: WordGroups<number> = [
  [1, 'jan january janvari जनवरी'],
  [2, 'feb february farvari फ़रवरी'],
  [3, 'mar march मार्च'],
  [4, 'apr april aprail अप्रैल'],
  [5, 'मई'],
  [6, 'jun june joon जून'],
  [7, 'jul july julai जुलाई'],
  [8, 'aug august agast अगस्त'],
  [9, 'sep sept september sitambar सितंबर सितम्बर'],
  [10, 'oct october aktubar अक्टूबर अक्तूबर'],
  [11, 'nov november navambar नवंबर नवम्बर'],
  [12, 'dec december disambar दिसंबर दिसम्बर'],
];

/** Romanised "mai" (in) and English "may" (modal) are the month only beside a day or a year. */
export const AMBIGUOUS_MONTH_WORDS: WordGroups<number> = [[5, 'may mai']];

/** Day offsets from today; kal means both yesterday and tomorrow, so it is confirmed. */
export const RELATIVE_DAY_WORDS: PhraseGroups<number> = [
  [0, 'aaj | आज | today'],
  [1, 'kal | कल | tomorrow'],
  [2, 'parson | परसों | day after tomorrow'],
];

/** Month offsets from today's month: "is mahine" = this month, "agle mahine" = the next one. */
export const RELATIVE_MONTH_PHRASES: PhraseGroups<number> = [
  [0, 'is mahine | this month | इस महीने'],
  [1, 'agle mahine | next month | अगले महीने'],
];

/** Week offsets: "is hafte" = the rest of this week, "agle hafte" = next Monday–Sunday. */
export const RELATIVE_WEEK_PHRASES: PhraseGroups<number> = [
  [0, 'is hafte | this week | इस हफ्ते'],
  [1, 'agle hafte | next week | अगले हफ्ते'],
];
/** isoWeekday numbers Sunday 0 … Saturday 6; a planning week runs Monday to Sunday. */
export const WEEK_START_WEEKDAY = 1;

/** "agle saal" only hints the year; it never becomes dates. */
export const NEXT_YEAR_PHRASES: PhraseGroups<number> = [[1, 'agle saal | next year | अगले साल']];

/** "N din/hafte/mahine baad" (or "in N weeks"): the unit word and its length in days. */
export const DURATION_UNITS: WordGroups<'day' | 'week' | 'month'> = [
  ['day', 'din दिन day days'],
  ['week', 'hafte hafta हफ्ते हफ्ता week weeks'],
  ['month', 'mahine mahina महीने महीना month months'],
];
export const DAYS_PER_WEEK = 7;
export const AFTER_DURATION_WORDS = words('baad बाद later');

/** Seasons only hint the date; they never become a window (battery B49). */
export const SEASON_WORDS = words(
  'sardi sardiyon sardiyo winter winters garmi garmiyon summer baarish monsoon सर्दी सर्दियों गर्मी बारिश',
);

/** Where an event sits relative to a festival F: after = [F+1, F+30], before = [F−30, F−1]… */
export type FestivalRelation = 'after' | 'before' | 'around' | 'on';

export const FESTIVAL_RELATION_PHRASES: PhraseGroups<FestivalRelation> = [
  ['after', 'ke baad | के बाद | after | baad'],
  ['before', 'ke pehle | se pehle | के पहले | से पहले | before | pehle'],
  ['around', 'ke aas paas | ke aaspaas | ke time | around | के आसपास'],
  ['on', 'par | pe | on | ko | पर | को'],
];

/** Window lengths around a festival (grade D): FESTIVAL_AFTER_DAYS, FESTIVAL_AROUND_DAYS. */
export const FESTIVAL_AFTER_DAYS = 30;
export const FESTIVAL_AROUND_DAYS = 7;
