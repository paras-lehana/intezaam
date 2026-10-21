/**
 * Timeline phases and lead-time arithmetic (TL-02, TL-03, TL-05).
 *
 * Responsibility: the eight planning phases with each family's typical window (03 §4),
 * month-to-day conversion, the compression step for late tasks and the peak-season
 * warning window. Boundary: vocabulary and constants; the timeline engine schedules.
 */
import type { EventFamily } from './events.js';

export const TIMELINE_PHASES = [
  'decide',
  'book-core',
  'book-specialists',
  'invite',
  'finalise',
  'final-week',
  'day-of',
  'after',
] as const;

export type TimelinePhase = (typeof TIMELINE_PHASES)[number];

export interface PhaseLabel {
  readonly label: string;
  readonly labelHi: string;
  /** Typical window per family, shown under the phase heading (03 §4). */
  readonly windowByFamily: Readonly<Record<EventFamily, string>>;
}

export const PHASE_LABELS: Readonly<Record<TimelinePhase, PhaseLabel>> = {
  decide: {
    label: 'Decide the basics',
    labelHi: 'मूल बातें तय करें',
    windowByFamily: {
      wedding: '12 to 9 months before',
      birthday: '6 weeks before',
      community: '12 to 10 weeks before',
      'family-function': '2 months before',
    },
  },
  'book-core': {
    label: 'Book the big things',
    labelHi: 'मुख्य बुकिंग',
    windowByFamily: {
      wedding: '9 to 6 months before',
      birthday: '6 to 5 weeks before',
      community: '10 to 8 weeks before',
      'family-function': '2 months to 6 weeks before',
    },
  },
  'book-specialists': {
    label: 'Book specialists and outfits',
    labelHi: 'विशेषज्ञ और पहनावा',
    windowByFamily: {
      wedding: '6 to 4 months before',
      birthday: '5 to 4 weeks before',
      community: '8 to 6 weeks before',
      'family-function': '6 to 4 weeks before',
    },
  },
  invite: {
    label: 'Invite and announce',
    labelHi: 'निमंत्रण',
    windowByFamily: {
      wedding: '4 to 3 months before',
      birthday: '4 weeks before',
      community: '6 to 4 weeks before',
      'family-function': '4 weeks before',
    },
  },
  finalise: {
    label: 'Finalise the details',
    labelHi: 'अंतिम तैयारी',
    windowByFamily: {
      wedding: '3 months to 1 month before',
      birthday: '2 weeks before',
      community: '4 to 2 weeks before',
      'family-function': '2 weeks before',
    },
  },
  'final-week': {
    label: 'Final week',
    labelHi: 'आख़िरी हफ़्ता',
    windowByFamily: {
      wedding: '3 weeks to 1 day before',
      birthday: '1 week before',
      community: '1 week before',
      'family-function': '1 week before',
    },
  },
  'day-of': {
    label: 'On the day',
    labelHi: 'उस दिन',
    windowByFamily: {
      wedding: 'The day',
      birthday: 'The day',
      community: 'The day',
      'family-function': 'The day',
    },
  },
  after: {
    label: 'Wrap up',
    labelHi: 'समापन',
    windowByFamily: {
      wedding: 'Up to a month after',
      birthday: 'The week after',
      community: 'Two weeks after',
      'family-function': 'The week after',
    },
  },
};

/** TL-02 / CTX-05: a month is 365.25 ÷ 12 = 30.4375 days (owner's planner, 01 §3.3). */
export const DAYS_PER_MONTH = 30.4375;

export const DAYS_PER_WEEK = 7;

/** TL-03: late tasks are packed into the days left in 1–3-day steps (01 §2). */
export const COMPRESSION_STEP_DAYS = { min: 1, max: 3 } as const;

/** VER-T: warn when the venue or priest is unbooked with under 3 months left in peak season. */
export const PEAK_UNBOOKED_WARNING_DAYS = 90;

/** TL-05: "Choose your date" outranks every other task while the date is open (01 §3.3). */
export const CHOOSE_DATE_PRIORITY = 9;

/**
 * TL-02: lead months to whole days.
 * @example
 * monthsToDays(12); // 365
 * monthsToDays(0.25); // 8
 */
export function monthsToDays(months: number): number {
  return Math.round(months * DAYS_PER_MONTH);
}

/**
 * Lead weeks to days.
 * @example
 * weeksToDays(6); // 42
 */
export function weeksToDays(weeks: number): number {
  return weeks * DAYS_PER_WEEK;
}
