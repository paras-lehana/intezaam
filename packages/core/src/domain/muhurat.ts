/**
 * Curated wedding muhurat dates (DATE-02) for November 2026 to December 2027.
 *
 * Responsibility: the dates published panchangs agree on, each with the sources that list it,
 * plus the few dates where sources disagree (shown with both sides, never hidden). Boundary:
 * indicative North Indian panchang dates for New Delhi; other regional calendars use other
 * rules, so every use says "confirm with your family priest". Outside the curated range the
 * planner says it has no curated dates rather than guessing.
 */
import type { Confidence } from './source-types.js';
import type { SourceId } from './sources.js';

export interface MuhuratDate {
  readonly dateIso: string;
  /** Which sources list the date. */
  readonly sourceIds: readonly SourceId[];
  /** Present when published sources disagree about the date; says who differs and why. */
  readonly conflict?: string;
}

/** DATE-02 covers November 2026 to December 2027; other months have no curated dates. */
export const MUHURAT_CURATED_FROM_ISO = '2026-11-01';
export const MUHURAT_CURATED_TO_ISO = '2027-12-31';
export const MUHURAT_CONFIDENCE: Confidence = 'C';

/** Day numbers per month (1–12) for one year. */
type MonthDays = Readonly<Partial<Record<number, readonly number[]>>>;

/**
 * Drik Panchang's 2026 list; Aza Fashions and The Wedding Focus list the same dates where named.
 */
const AGREED_2026: MonthDays = { 11: [21, 24, 25, 26], 12: [2, 3, 4, 5, 6, 11, 12] };
const BLOGS_2026_BOTH = new Set([
  '2026-11-21',
  '2026-11-24',
  '2026-11-25',
  '2026-11-26',
  '2026-12-02',
  '2026-12-03',
  '2026-12-04',
  '2026-12-11',
  '2026-12-12',
]);

/**
 * 2027: listed by Drik Panchang and VedicFeed, and confirmed by at least one independent engine.
 * GaneshaSpeaks lists every one except 24 January. August to October
 * are empty: Chaturmas, the Sun in Simha and Kanya, and Venus and Jupiter combust.
 */
const AGREED_2027: MonthDays = {
  1: [15, 18, 19, 20, 24, 26, 27, 30, 31],
  2: [2, 3, 9, 10, 11, 14, 15, 21, 22, 25, 26, 27, 28],
  3: [1, 2, 3, 4, 9, 10, 14],
  4: [18, 19, 21, 23, 24, 25, 26, 27, 28],
  5: [4, 7, 9, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 30, 31],
  6: [1, 5, 9, 10, 11, 12, 13, 15, 16, 17, 19, 20, 21, 26, 27, 28],
  7: [7, 8, 9, 11, 12],
  11: [10, 11, 15, 16, 20, 21, 23, 24, 25, 26, 29],
  12: [2, 7, 8, 9, 12, 13, 14],
};
const GANESHASPEAKS_OMITS_2027 = '2027-01-24';

/** Dates published sources disagree on: both sides are shown. */
const CONFLICTS: readonly MuhuratDate[] = [
  {
    dateIso: '2026-12-01',
    sourceIds: ['S-AZA-MUHURAT-2026'],
    conflict: 'Listed by Aza Fashions only; Drik Panchang and The Wedding Focus do not list it.',
  },
  {
    dateIso: '2026-12-13',
    sourceIds: ['S-AZA-MUHURAT-2026'],
    conflict: 'Listed by Aza Fashions only; Drik Panchang and The Wedding Focus do not list it.',
  },
  {
    dateIso: '2027-05-08',
    sourceIds: [
      'S-VEDICFEED-2027',
      'S-GANESHASPEAKS-2027',
      'S-PANCHANGBODH-2027',
      'S-KUNDLIGPT-2027',
    ],
    conflict: 'Drik Panchang does not list it: a prohibited yoga overlaps the nakshatra.',
  },
  {
    dateIso: '2027-07-01',
    sourceIds: ['S-DRIK-MUHURAT-2027', 'S-PANCHANGBODH-2027'],
    conflict:
      'A short pre-dawn window (02:50–05:27 on 2 July); VedicFeed and GaneshaSpeaks do not list it.',
  },
  {
    dateIso: '2027-11-28',
    sourceIds: ['S-PANCHANGBODH-2027', 'S-KUNDLIGPT-2027'],
    conflict:
      'Drik Panchang, VedicFeed and GaneshaSpeaks do not list it: a prohibited karana overlaps.',
  },
];

/** Two-digit zero padding for ISO months and days. */
const pad = (n: number): string => String(n).padStart(2, '0');

function expand(
  year: number,
  months: MonthDays,
  sources: (dateIso: string) => readonly SourceId[],
): MuhuratDate[] {
  return Object.entries(months).flatMap(([month, days]) =>
    (days ?? []).map((day) => {
      const dateIso = `${year}-${pad(Number(month))}-${pad(day)}`;
      return { dateIso, sourceIds: sources(dateIso) };
    }),
  );
}

function sources2026(dateIso: string): readonly SourceId[] {
  return BLOGS_2026_BOTH.has(dateIso)
    ? ['S-DRIK-MUHURAT-2026', 'S-AZA-MUHURAT-2026', 'S-WEDFOCUS-2026']
    : ['S-DRIK-MUHURAT-2026', 'S-WEDFOCUS-2026'];
}

function sources2027(dateIso: string): readonly SourceId[] {
  return dateIso === GANESHASPEAKS_OMITS_2027
    ? ['S-DRIK-MUHURAT-2027', 'S-VEDICFEED-2027']
    : ['S-DRIK-MUHURAT-2027', 'S-VEDICFEED-2027', 'S-GANESHASPEAKS-2027'];
}

/** Every curated date, agreed and disputed, in date order. */
export const MUHURAT_DATES: readonly MuhuratDate[] = [
  ...expand(2026, AGREED_2026, sources2026),
  ...expand(2027, AGREED_2027, sources2027),
  ...CONFLICTS,
].sort((a, b) => a.dateIso.localeCompare(b.dateIso));

/**
 * The curated entry for a date, or undefined when the date is not a listed muhurat.
 * @example
 * muhuratOn('2026-11-25')?.sourceIds.length; // 3
 */
export function muhuratOn(dateIso: string): MuhuratDate | undefined {
  return MUHURAT_DATES.find((entry) => entry.dateIso === dateIso);
}

/**
 * True when a date falls inside the curated muhurat range (so "not listed" is meaningful).
 * @example
 * isMuhuratCurated('2028-02-14'); // false
 */
export function isMuhuratCurated(dateIso: string): boolean {
  return dateIso >= MUHURAT_CURATED_FROM_ISO && dateIso <= MUHURAT_CURATED_TO_ISO;
}
