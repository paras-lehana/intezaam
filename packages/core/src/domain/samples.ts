/**
 * Sample contexts — the four "Try a sample" inputs, one per persona
 * (feature #4; README.md, "The personas").
 *
 * Responsibility: a Jaipur North-Indian wedding (Meena), a Bengaluru 7th birthday in the monsoon
 * (Arjun), a housing-society Ganesh utsav (Kavita) and a Chennai 60th, Shashtiabdapurti (Lakshmi
 * and Ravi), each stored WITHOUT a calendar date: a relative
 * timing (months ahead, or the next occurrence of a seasonal day) turns into a real date
 * against the caller's `todayIso`, so samples never go stale. Boundary: inputs only; the
 * form fills from them but never runs them (the user presses Plan).
 */
import type { EventContext } from '../schemas/context.js';
import { addDaysIso, addMonthsIso, nextOccurrenceIso } from './calendar.js';

export const SAMPLE_IDS = [
  'jaipur-wedding',
  'bengaluru-birthday',
  'society-ganesh',
  'chennai-60th',
] as const;

export type SampleId = (typeof SAMPLE_IDS)[number];

/** How a sample's date is derived from today. */
export type SampleTiming =
  | { readonly kind: 'months-ahead'; readonly months: number }
  | {
      readonly kind: 'next-occurrence';
      readonly month: number;
      readonly day: number;
      /** Skip to the following year when the next occurrence is closer than this. */
      readonly minDaysAhead: number;
    };

export interface SampleContext {
  readonly label: string;
  readonly description: string;
  readonly timing: SampleTiming;
  readonly context: Omit<EventContext, 'dateIso' | 'dateFlexible'>;
}

/** Seasonal samples sit at least 30 days out, so their timelines show a workable plan. */
const SEASONAL_MIN_DAYS = 30;

export const SAMPLE_CONTEXTS: Readonly<Record<SampleId, SampleContext>> = {
  'jaipur-wedding': {
    label: 'Jaipur wedding',
    description: '300 guests, ₹25 L, four functions, an outdoor sangeet with a DJ until 11:30 pm',
    // Four months out lands in peak season with core vendors already past their lead time.
    timing: { kind: 'months-ahead', months: 4 },
    context: {
      family: 'wedding',
      kind: 'wedding',
      title: 'Jaipur wedding',
      tradition: 'north-hindu',
      city: 'Jaipur',
      destination: false,
      guests: 300,
      budgetInr: 2_500_000,
      functions: ['mehendi', 'sangeet', 'wedding', 'reception'],
      venueSetting: 'mixed',
      diet: { menu: 'veg', jainGuests: true, halal: false, satvik: false },
      alcohol: false,
      priorities: ['catering', 'decor', 'photo_video'],
      cut: 'transport',
      disabledCategories: [],
      styleTags: ['royal', 'traditional', 'floral'],
      accessibility: { elderly: true, wheelchair: false, kids: false },
      helpLevel: 'family',
      toggles: { jewellery: false, planner: false },
      outstationShare: 0.4,
      sound: { amplified: true, endHhmm: '23:30', nearSilenceZone: false, crackers: false },
      language: 'en',
    },
  },
  'bengaluru-birthday': {
    label: '7th birthday in Bengaluru',
    description: '25 children and 10 adults, ₹40,000, a garden party in the rainy season',
    // Mid-July sits inside the southwest monsoon (June–September), so rain risk applies.
    timing: { kind: 'next-occurrence', month: 7, day: 18, minDaysAhead: SEASONAL_MIN_DAYS },
    context: {
      family: 'birthday',
      kind: 'kids-birthday',
      title: '7th birthday party',
      city: 'Bengaluru',
      destination: false,
      guests: 35,
      budgetInr: 40_000,
      functions: ['party'],
      venueSetting: 'outdoor',
      diet: { menu: 'veg', jainGuests: false, halal: false, satvik: false },
      alcohol: false,
      priorities: ['entertainment', 'catering', 'gifts'],
      cut: 'photo_video',
      disabledCategories: [],
      styleTags: ['colourful', 'quirky'],
      accessibility: { elderly: false, wheelchair: false, kids: true },
      helpLevel: 'diy',
      toggles: { jewellery: false, planner: false },
      outstationShare: 0,
      sound: { amplified: true, endHhmm: '20:00', nearSilenceZone: false, crackers: false },
      birthday: { age: 7, kidsCount: 25 },
      language: 'en',
    },
  },
  'society-ganesh': {
    label: 'Society Ganesh utsav',
    description: '240 flats, 5 days, about 1,200 visitors, a visarjan procession, ₹3.5 L',
    // Early September is Ganesh Chaturthi season (3–4 Sep in 2027).
    timing: { kind: 'next-occurrence', month: 9, day: 4, minDaysAhead: SEASONAL_MIN_DAYS },
    context: {
      family: 'community',
      kind: 'society-festival',
      title: 'Society Ganesh utsav',
      city: 'Pune',
      destination: false,
      guests: 600,
      budgetInr: 350_000,
      functions: ['puja', 'cultural-night', 'bhog', 'visarjan'],
      venueSetting: 'outdoor',
      diet: { menu: 'veg', jainGuests: false, halal: false, satvik: true },
      alcohol: false,
      priorities: ['decor', 'catering', 'safety_medical'],
      cut: 'promotion',
      disabledCategories: [],
      styleTags: ['traditional', 'colourful'],
      accessibility: { elderly: true, wheelchair: true, kids: true },
      helpLevel: 'family',
      toggles: { jewellery: false, planner: false },
      outstationShare: 0,
      sound: { amplified: true, endHhmm: '22:00', nearSilenceZone: false, crackers: false },
      community: {
        premises: 'private',
        days: 5,
        households: 240,
        footfall: 1_200,
        sponsorsInr: 60_000,
        rwaFundInr: 50_000,
        volunteers: 30,
      },
      language: 'hi',
    },
  },
  'chennai-60th': {
    label: "Appa's 60th in Chennai",
    description:
      'Shashtiabdapurti for 150 guests, many elders, ₹6 L, organised by two children from two cities',
    // Three months out: the priest's 2–3-month lead (TL-09) is due now, which the timeline should show.
    timing: { kind: 'months-ahead', months: 3 },
    context: {
      family: 'birthday',
      kind: 'sixtieth-birthday',
      title: "Appa's 60th (Shashtiabdapurti)",
      tradition: 'tamil',
      city: 'Chennai',
      destination: false,
      guests: 150,
      budgetInr: 600_000,
      functions: ['puja', 'meal'],
      venueSetting: 'indoor',
      diet: { menu: 'veg', jainGuests: false, halal: false, satvik: true },
      alcohol: false,
      priorities: ['rituals', 'catering', 'photo_video'],
      cut: 'entertainment',
      disabledCategories: [],
      styleTags: ['traditional', 'minimal'],
      accessibility: { elderly: true, wheelchair: true, kids: false },
      helpLevel: 'family',
      toggles: { jewellery: false, planner: false },
      outstationShare: 0.3,
      sound: { amplified: true, endHhmm: '21:00', nearSilenceZone: false, crackers: false },
      birthday: { age: 60 },
      language: 'ta',
    },
  },
};

/**
 * The real date a sample timing resolves to for a given today.
 * @example
 * sampleDate({ kind: 'months-ahead', months: 4 }, '2026-10-20'); // '2027-02-20'
 */
export function sampleDate(timing: SampleTiming, todayIso: string): string | undefined {
  if (timing.kind === 'months-ahead') return addMonthsIso(todayIso, timing.months);
  const earliest = addDaysIso(todayIso, timing.minDaysAhead);
  if (earliest === undefined) return undefined;
  return nextOccurrenceIso(earliest, timing.month, timing.day);
}

/**
 * A complete EventContext for a sample, dated relative to `todayIso`; an unusable today
 * gives an undated ("not fixed yet") context instead of a wrong date.
 * @example
 * sampleContext('jaipur-wedding', '2026-10-20').dateIso; // '2027-02-20'
 */
export function sampleContext(id: SampleId, todayIso: string): EventContext {
  const sample = SAMPLE_CONTEXTS[id];
  const dateIso = sampleDate(sample.timing, todayIso);
  return dateIso === undefined
    ? { ...sample.context, dateFlexible: true }
    : { ...sample.context, dateIso, dateFlexible: false };
}
