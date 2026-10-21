/**
 * Seasons, monsoon and calendar pauses (CTX-04, CTX-07, DATE-01, DATE-03).
 *
 * Responsibility: peak and off-peak months, the weekday rule, the off-peak price factor,
 * rain patterns by city (WET_PATTERN_INFO), and the Chaturmas and Kharmas windows for 2026–27 with their
 * sources. Boundary: indicative data; the UI always says "confirm with your pandit" and
 * the pauses apply to Hindu traditions only (CTX-08, traditions.ts).
 */
import type { SourceId } from './sources.js';
import type { Confidence } from './source-types.js';
import { percentFactor, range } from './units.js';

/** DATE-01 / CTX-04: November–February is peak wedding season (hotel industry; CAIT season). */
export const PEAK_MONTHS: readonly number[] = [11, 12, 1, 2];

/** CTX-04: July–September is off-peak; functions are 15–20% cheaper (S-RSA-2026). */
export const OFF_PEAK_MONTHS: readonly number[] = [7, 8, 9];

/** CTX-04: Monday–Thursday count as weekdays for the weekday saving (Sunday = 0; grade D). */
export const DISCOUNT_WEEKDAYS: readonly number[] = [1, 2, 3, 4];

/** CST-03 / LEV-02: off-peak and weekday functions are 15–20% cheaper (S-RSA-2026, grade C). */
export const OFF_PEAK_SAVING_PCT = range(15, 20);

/**
 * CST-03: the factor on venue, catering and decor for an off-peak or weekday date — the low
 * end of the published saving, so a plan never counts on the best discount.
 */
export const OFF_PEAK_PRICE_FACTOR = percentFactor(-OFF_PEAK_SAVING_PCT.min);

/** DATE-01: peak-season muhurat dates fill 8–12 months ahead (S-IMW-2026). */
export const PEAK_BOOKING_LEAD_MONTHS = range(8, 12);

/** CTX-07: the southwest monsoon covers India from about 1 June to mid-October (IMD normals). */
export const SW_MONSOON_MONTHS: readonly number[] = [6, 7, 8, 9];

/** CTX-07: the northeast monsoon season is October–December (IMD Chennai NEM 2025 report). */
export const NE_MONSOON_MONTHS: readonly number[] = [10, 11, 12];

/**
 * CTX-07: states whose meteorological subdivisions the northeast monsoon covers — Tamil Nadu,
 * Puducherry & Karaikal, Kerala & Mahe, Coastal Andhra Pradesh & Yanam and Rayalaseema
 * (IMD, S-IMD-NEM-2026). South Interior Karnataka is the fifth: its cities opt in by row,
 * because coastal and north Karnataka are outside it.
 */
export const NE_MONSOON_STATES: readonly string[] = [
  'Tamil Nadu',
  'Puducherry',
  'Kerala',
  'Andhra Pradesh',
];

/** Per-city rain patterns (CTX-07, 09 §5.6 row 5): which months an open-air event is rain-risk. */
export const WET_PATTERNS = ['southwest', 'southwest-and-northeast', 'bengaluru'] as const;

export type WetPattern = (typeof WET_PATTERNS)[number];

export interface WetPatternInfo {
  /** Months (1–12) when an open-air event is rain-risk. */
  readonly months: readonly number[];
  readonly basis: string;
  readonly sourceIds: readonly SourceId[];
  readonly confidence: Confidence;
}

/** September and October are Bengaluru's rainiest months (1901–2000 data, S-CITIZENMATTERS-2016). */
const BENGALURU_PEAK_MONTHS: readonly number[] = [9, 10];

export const WET_PATTERN_INFO: Readonly<Record<WetPattern, WetPatternInfo>> = {
  southwest: {
    months: SW_MONSOON_MONTHS,
    basis: 'Southwest monsoon, June–September',
    sourceIds: ['S-IMD-2020'],
    confidence: 'A',
  },
  'southwest-and-northeast': {
    months: [...SW_MONSOON_MONTHS, ...NE_MONSOON_MONTHS],
    basis: 'Southwest monsoon June–September, then the northeast monsoon October–December',
    sourceIds: ['S-IMD-2020', 'S-IMD-NEM-2026', 'S-TRIBUNE-2025'],
    confidence: 'A',
  },
  // City data, not the subdivision season: the rainiest months are named, Nov–Dec are not.
  bengaluru: {
    months: [...new Set([...SW_MONSOON_MONTHS, ...BENGALURU_PEAK_MONTHS])],
    basis: 'Southwest monsoon June–September; September and October are the rainiest months',
    sourceIds: ['S-IMD-2020', 'S-CITIZENMATTERS-2016'],
    confidence: 'C',
  },
};

export const CALENDAR_PAUSE_IDS = [
  'kharmas-2026-spring',
  'chaturmas-2026',
  'kharmas-2026-winter',
  'kharmas-2027-spring',
  'chaturmas-2027',
  'kharmas-2027-winter',
] as const;

export type CalendarPauseId = (typeof CALENDAR_PAUSE_IDS)[number];

export interface CalendarPause {
  readonly kind: 'chaturmas' | 'kharmas';
  readonly label: string;
  readonly startIso: string;
  readonly endIso: string;
  readonly note: string;
  readonly sourceIds: readonly SourceId[];
  readonly confidence: Confidence;
}

/**
 * Kharmas follows the Sun into Sagittarius (Dhanu) and Pisces (Meena). The 2026 spring edges are
 * our reading of one blog (D); from winter 2026 on, Drik Panchang's day-by-day reasons and its
 * calendar give the edges (research 09, Gap 3 §3.4).
 */
const KHARMAS_NOTE = 'Indicative: dates open again after about the 14th. Confirm with your pandit.';
const KHARMAS_SOURCES: readonly SourceId[] = ['S-SMARTPUJA-KHARMAS-2026'];
const KHARMAS_SOURCES_2027: readonly SourceId[] = ['S-DRIK-MUHURAT-2027', 'S-DRIK-2027'];

export const CALENDAR_PAUSES: Readonly<Record<CalendarPauseId, CalendarPause>> = {
  'kharmas-2026-spring': {
    kind: 'kharmas',
    label: 'Kharmas (spring 2026)',
    startIso: '2026-03-15',
    endIso: '2026-04-14',
    note: KHARMAS_NOTE,
    sourceIds: KHARMAS_SOURCES,
    confidence: 'D',
  },
  'chaturmas-2026': {
    kind: 'chaturmas',
    label: 'Chaturmas 2026',
    startIso: '2026-07-25',
    endIso: '2026-11-20',
    note: 'Devshayani to Devutthana Ekadashi; sources disagree on the exact days and South Indian practice is more flexible.',
    sourceIds: ['S-SMARTPUJA-2026', 'S-WIKI-CHATURMAS'],
    confidence: 'C',
  },
  'kharmas-2026-winter': {
    kind: 'kharmas',
    label: 'Kharmas (winter 2026–27)',
    startIso: '2026-12-16',
    endIso: '2027-01-14',
    note: KHARMAS_NOTE,
    sourceIds: KHARMAS_SOURCES_2027,
    confidence: 'B',
  },
  'kharmas-2027-spring': {
    kind: 'kharmas',
    label: 'Kharmas (spring 2027)',
    startIso: '2027-03-15',
    endIso: '2027-04-14',
    note: KHARMAS_NOTE,
    sourceIds: KHARMAS_SOURCES_2027,
    confidence: 'B',
  },
  // Devshayani Ekadashi 14 Jul to Devutthana Ekadashi 10 Nov; Drik blocks weddings 13 Jul–9 Nov.
  'chaturmas-2027': {
    kind: 'chaturmas',
    label: 'Chaturmas 2027',
    startIso: '2027-07-13',
    endIso: '2027-11-09',
    note: 'Devshayani to Devutthana Ekadashi (10 Nov reopens). North Indian practice; South Indian families are more flexible.',
    sourceIds: ['S-DRIK-MUHURAT-2027', 'S-DRIK-2027', 'S-DEKHO-2027'],
    confidence: 'B',
  },
  'kharmas-2027-winter': {
    kind: 'kharmas',
    label: 'Kharmas (winter 2027–28)',
    startIso: '2027-12-16',
    endIso: '2028-01-14',
    note: KHARMAS_NOTE,
    sourceIds: KHARMAS_SOURCES_2027,
    confidence: 'B',
  },
};

/**
 * The curated pauses that contain a date (ISO strings compare correctly as text).
 * @example
 * pausesOn('2026-12-20'); // ['kharmas-2026-winter']
 */
export function pausesOn(dateIso: string): CalendarPauseId[] {
  return CALENDAR_PAUSE_IDS.filter((id) => {
    const pause = CALENDAR_PAUSES[id];
    return dateIso >= pause.startIso && dateIso <= pause.endIso;
  });
}
