/**
 * Brief battery, Hinglish date briefs (research note 09 §5.4: B41–B49).
 *
 * Responsibility: dates a family types loosely — short lead times, Hindu-month windows that are
 * not curated, "kal", "mai" meaning May or "in", and seasons that must stay open rather than be
 * guessed. Boundary: labelled test data only.
 */
import type { BriefCase } from './brief-case.js';

export const HINGLISH_DATE_BRIEFS: readonly BriefCase[] = [
  {
    id: 'B41',
    lang: 'HG',
    text: 'agle mahine shaadi hai, help!',
    expect: { family: 'wedding', month: 11, dateFlexible: true },
    missing: ['city', 'guests', 'budget'],
    absent: [],
    tests: 'Short lead time: the time verdict reads Critical downstream',
  },
  {
    id: 'B42',
    lang: 'HG',
    text: 'Kartik mein shaadi, 200 log, Varanasi',
    expect: { family: 'wedding', guests: 200, city: 'Varanasi' },
    missing: ['date', 'budget'],
    absent: ['dateIso', 'month'],
    tests: 'Hindu-month windows are not curated yet (09 §5.7): the date stays open',
  },
  {
    id: 'B43',
    lang: 'HG',
    text: 'Dussehra ke baad party, 40 log',
    expect: { guests: 40, month: 11, dateFlexible: true },
    missing: ['family', 'city', 'budget'],
    absent: ['family'],
    tests: 'A festival on the battery day counts as the current one',
  },
  {
    id: 'B44',
    lang: 'HG',
    text: 'Holi ke aas paas get-together, 60 log, Noida, pachaas hazaar',
    expect: {
      family: 'family-function',
      guests: 60,
      city: 'Noida',
      budgetInr: 50_000,
      month: 3,
      dateFlexible: true,
    },
    missing: [],
    absent: [],
    tests: 'Holi 2027 ± 7 days; pachaas hazaar',
  },
  {
    id: 'B45',
    lang: 'HG',
    text: 'kal shaam beti ki teen birthday party, 15 log',
    expect: { family: 'birthday', kind: 'teen-birthday', dateIso: '2026-10-21', guests: 15 },
    missing: ['city', 'budget'],
    absent: [],
    tests: 'kal reads as tomorrow (the form asks to confirm); "teen" is not 3',
  },
  {
    id: 'B46',
    lang: 'HG',
    text: 'do hafte baad mundan, 30 log',
    expect: { family: 'family-function', kind: 'naming-mundan', dateIso: '2026-11-03', guests: 30 },
    missing: ['city', 'budget'],
    absent: [],
    tests: 'Today plus 14 days',
  },
  {
    id: 'B47',
    lang: 'HG',
    text: '12 mai ko shaadi, Jaipur mai, 250 log',
    expect: { family: 'wedding', dateIso: '2027-05-12', city: 'Jaipur', guests: 250 },
    missing: ['budget'],
    absent: [],
    tests: '"mai" beside a day number is May; "Jaipur mai" means "in Jaipur"',
  },
  {
    id: 'B48',
    lang: 'HG',
    text: 'Sawan mein bhandara, 500 log',
    expect: { family: 'community', kind: 'religious-gathering', guests: 500 },
    missing: ['date', 'city', 'budget'],
    absent: ['dateIso', 'month'],
    tests: 'Hindu-month windows are not curated yet (09 §5.7)',
  },
  {
    id: 'B49',
    lang: 'HG',
    text: 'shaadi agle saal sardiyon mein, 300 log',
    expect: { family: 'wedding', guests: 300, dateFlexible: true },
    missing: ['city', 'budget'],
    absent: ['dateIso', 'month'],
    tests: 'A season is never over-resolved into dates',
  },
];
