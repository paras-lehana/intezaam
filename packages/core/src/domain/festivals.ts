/**
 * Festival dates (DATE-05) for the rest of 2026 and for 2027, and the muhurat re-exports.
 *
 * Responsibility: major festival dates, with every candidate date where sources differ, so
 * a clash check widens its window instead of hiding a disagreement. Boundary: indicative
 * only; every clash note says "confirm locally". Muhurat dates live in muhurat.ts and are
 * re-exported here so date intelligence has one import.
 */
import type { SourceId } from './sources.js';
import type { Confidence } from './source-types.js';

export {
  isMuhuratCurated,
  MUHURAT_CONFIDENCE,
  MUHURAT_CURATED_FROM_ISO,
  MUHURAT_CURATED_TO_ISO,
  MUHURAT_DATES,
  muhuratOn,
  type MuhuratDate,
} from './muhurat.js';

export const FESTIVAL_IDS = [
  'dussehra-2026',
  'diwali-2026',
  'gurpurab-2026',
  'christmas-2026',
  'makar-sankranti-2027',
  'eid-al-fitr-2027',
  'holi-2027',
  'ram-navami-2027',
  'eid-al-adha-2027',
  'janmashtami-2027',
  'ganesh-chaturthi-2027',
  'onam-2027',
  'dussehra-2027',
  'diwali-2027',
  'gurpurab-2027',
  'christmas-2027',
] as const;

export type FestivalId = (typeof FESTIVAL_IDS)[number];

export interface FestivalDate {
  readonly name: string;
  /** Every candidate date; more than one means the sources differ. */
  readonly datesIso: readonly string[];
  readonly sourceIds: readonly SourceId[];
  readonly confidence: Confidence;
}

/** The 2026 central holiday order (DoPT O.M. of 3 Jul 2025). */
const DOPT_2026: readonly SourceId[] = ['S-DOPT-2026'];
/** The central holiday order plus Drik Panchang and OfficeHolidays. */
const DOPT_DRIK_OH: readonly SourceId[] = ['S-DOPT-2027', 'S-DRIK-2027', 'S-OFFICEHOLIDAYS-2027'];
const DOPT_OH: readonly SourceId[] = ['S-DOPT-2027', 'S-OFFICEHOLIDAYS-2027'];

export const FESTIVAL_DATES: Readonly<Record<FestivalId, FestivalDate>> = {
  'dussehra-2026': {
    name: 'Dussehra',
    datesIso: ['2026-10-20'],
    sourceIds: DOPT_2026,
    confidence: 'A',
  },
  'diwali-2026': {
    name: 'Diwali',
    datesIso: ['2026-11-08'],
    sourceIds: ['S-DOPT-2026', 'S-WIKI-DIWALI', 'S-SMARTPUJA-DIWALI-ND'],
    confidence: 'A',
  },
  'gurpurab-2026': {
    name: 'Guru Nanak Jayanti (Gurpurab)',
    datesIso: ['2026-11-24'],
    sourceIds: DOPT_2026,
    confidence: 'A',
  },
  'christmas-2026': {
    name: 'Christmas',
    datesIso: ['2026-12-25'],
    sourceIds: DOPT_2026,
    confidence: 'A',
  },
  // The Sun enters Makara at 21:06 IST on 14 Jan, so observance moves to the 15th by Drik's rule.
  'makar-sankranti-2027': {
    name: 'Makar Sankranti and Pongal',
    datesIso: ['2027-01-14', '2027-01-15'],
    sourceIds: ['S-DOPT-2027', 'S-DRIK-2027'],
    confidence: 'B',
  },
  // Depends on the moon sighting.
  'eid-al-fitr-2027': {
    name: 'Eid al-Fitr',
    datesIso: ['2027-03-09', '2027-03-10'],
    sourceIds: DOPT_OH,
    confidence: 'B',
  },
  // The central list gives 23 Mar; Drik Panchang and Dekho Panchang give 22 Mar.
  'holi-2027': {
    name: 'Holi',
    datesIso: ['2027-03-22', '2027-03-23'],
    sourceIds: DOPT_DRIK_OH,
    confidence: 'B',
  },
  'ram-navami-2027': {
    name: 'Ram Navami (end of Chaitra Navratri, 7–15 Apr)',
    datesIso: ['2027-04-15'],
    sourceIds: DOPT_DRIK_OH,
    confidence: 'A',
  },
  'eid-al-adha-2027': {
    name: 'Eid al-Adha',
    datesIso: ['2027-05-17'],
    sourceIds: DOPT_OH,
    confidence: 'B',
  },
  'janmashtami-2027': {
    name: 'Janmashtami',
    datesIso: ['2027-08-25'],
    sourceIds: ['S-DOPT-2027'],
    confidence: 'A',
  },
  // Visarjan (Anant Chaturdashi) is 14 Sep; community events plan the whole 4–14 Sep span.
  'ganesh-chaturthi-2027': {
    name: 'Ganesh Chaturthi (visarjan 14 Sep)',
    datesIso: ['2027-09-04'],
    sourceIds: DOPT_DRIK_OH,
    confidence: 'A',
  },
  'onam-2027': {
    name: 'Onam (Thiruvonam; holidays 11–14 Sep)',
    datesIso: ['2027-09-12'],
    sourceIds: DOPT_DRIK_OH,
    confidence: 'A',
  },
  'dussehra-2027': {
    name: 'Dussehra (Navratri 30 Sep–8 Oct, Durga Puja 6–9 Oct)',
    datesIso: ['2027-10-09'],
    sourceIds: DOPT_DRIK_OH,
    confidence: 'A',
  },
  // 28 Oct is Naraka Chaturdashi and Kali Puja; Lakshmi Puja is on the 29th.
  'diwali-2027': {
    name: 'Diwali',
    datesIso: ['2027-10-29'],
    sourceIds: DOPT_DRIK_OH,
    confidence: 'A',
  },
  // The central list and Drik give 14 Nov; OfficeHolidays gives 13 Nov.
  'gurpurab-2027': {
    name: 'Guru Nanak Jayanti (Gurpurab)',
    datesIso: ['2027-11-13', '2027-11-14'],
    sourceIds: DOPT_DRIK_OH,
    confidence: 'B',
  },
  'christmas-2027': {
    name: 'Christmas',
    datesIso: ['2027-12-25'],
    sourceIds: DOPT_OH,
    confidence: 'A',
  },
};

/** DATE-05: within one day of a festival, vendors are scarcer and dearer (grade D). */
export const FESTIVAL_CLASH_WINDOW_DAYS = 1;
