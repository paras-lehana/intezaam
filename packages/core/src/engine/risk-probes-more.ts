/**
 * More risk probes (RISK) — diet, calendar and people checks.
 *
 * Responsibility: Jain guests and sunset, Chaturmas and Kharmas, festival clashes, a missing
 * rest day, silence zones, elders and children, alcohol licences, very large crowds, too few
 * volunteers, an estimated budget and charity receipts — each with its cause and fix; every
 * time, limit and count in the copy is read from the rule's own constant. Boundary:
 * detection and wording only; risk-probes-money.ts holds the food and rooms gaps.
 */
import { CROWD_CLASS_MAX } from '../domain/crowd.js';
import { FUNCTION_PROFILES } from '../domain/functions.js';
import { NOISE_LIMITS_DBA } from '../domain/permissions.js';
import { formatLakh } from '../format.js';
import { clockLabel, toMinutes } from './clock.js';
import { celebratesFestival } from './date-hazards.js';
import { LATE_END_HHMM } from './functions.js';
import { noteIds, type Probe } from './risk-probes.js';

/** Sunset across Indian cities in the wedding season falls around 5:30–6:30 pm (grade D). */
const JAIN_SUNSET_HHMM = '18:00';

const jainProbe: Probe = ({ food, timings }) => {
  if (!food.counters.includes('jain')) return null;
  const late = timings.filter((timing) => {
    const meal = FUNCTION_PROFILES[timing.kind].meal;
    return (
      (meal === 'dinner' || meal === 'snacks') &&
      toMinutes(timing.startHhmm) >= toMinutes(JAIN_SUNSET_HHMM)
    );
  });
  if (late.length === 0) return null;
  return {
    id: 'risk-jain-sunset',
    ruleId: 'DIET-01',
    severity: 'medium',
    title: 'Jain guests eat before sunset',
    detail: `${late.map((timing) => timing.label).join(', ')} start after sunset.`,
    fix: `Serve the Jain counter early (before about ${clockLabel(JAIN_SUNSET_HHMM)}) or send Jain guests a packed meal.`,
    traceIds: food.traceIds,
  };
};

const pauseProbe: Probe = ({ ctx, timeline }) => {
  if (ctx.season.pauses.length === 0 || ctx.dateMode !== 'dated') return null;
  return {
    id: 'risk-calendar-pause',
    ruleId: 'DATE-03',
    severity: 'medium',
    title: 'The date falls in Chaturmas or Kharmas',
    detail:
      'Many Hindu families avoid weddings in these months (indicative; practice varies by region).',
    fix: 'Confirm the date with your family priest, or look at the listed muhurat dates.',
    traceIds: noteIds(timeline.dateNotes, 'calendar-pause'),
  };
};

const festivalProbe: Probe = ({ ctx, timeline }) => {
  const ids = noteIds(timeline.dateNotes, 'festival-clash');
  if (ids.length === 0) return null;
  // A pandal or society utsav cannot move off its own festival: say "book early" instead.
  const own = celebratesFestival(ctx);
  return {
    id: 'risk-festival-clash',
    ruleId: 'DATE-05',
    severity: 'info',
    title: own
      ? 'Your festival is peak season for its vendors'
      : 'A major festival is within a day of your functions',
    detail: own
      ? 'Idol makers, pandal builders and decorators are busiest around the festival itself.'
      : 'Vendors are scarcer and dearer around festivals.',
    fix: own
      ? 'Book the idol, pandal and decor early and confirm prices in writing.'
      : 'Book early and confirm prices in writing, or shift the date by a few days.',
    traceIds: ids,
  };
};

const restDayProbe: Probe = ({ restDayTraceId }) => {
  if (restDayTraceId === null) return null;
  return {
    id: 'risk-rest-day',
    ruleId: 'FN-04',
    severity: 'medium',
    title: 'No rest between a late sangeet and an early muhurat',
    detail: 'The sangeet ends late and the ceremony starts early the next morning.',
    fix: `Move the sangeet a day earlier, or end it by ${clockLabel(LATE_END_HHMM)}.`,
    traceIds: [restDayTraceId],
  };
};

const silenceProbe: Probe = ({ permissions }) => {
  const zone = permissions.find(
    (permission) => permission.id === 'silence-zone' && permission.required,
  );
  if (zone === undefined) return null;
  return {
    id: 'risk-silence-zone',
    ruleId: 'PERM-03',
    severity: 'medium',
    title: 'Near a hospital, school or court',
    detail: `Silence-zone limits of ${NOISE_LIMITS_DBA.silence.day} dB(A) by day and ${NOISE_LIMITS_DBA.silence.night} dB(A) at night apply.`,
    fix: 'Keep amplified sound low or indoors, and check the zone with the police.',
    traceIds: zone.traceIds,
  };
};

const peopleProbe: Probe = ({ ctx }) => {
  if (ctx.accessNeeds.length === 0) return null;
  return {
    id: 'risk-access',
    ruleId: 'ACC-04',
    severity: 'info',
    title: 'Elders, wheelchair users or young children are coming',
    detail: `Needs: ${ctx.accessNeeds.join(', ')}.`,
    fix: 'Follow the accessibility plan: ramps, seating near the stage and exits, a first-aid post and a safe corner for children.',
    traceIds: [],
  };
};

const alcoholProbe: Probe = ({ ctx }) => {
  if (!ctx.input.alcohol) return null;
  return {
    id: 'risk-alcohol',
    ruleId: 'RISK',
    severity: 'info',
    title: 'Serving alcohol needs a licence',
    detail: 'Licence rules for events vary by state.',
    fix: 'Check your state’s event licence rules and who at the venue holds the licence; plan mocktails too.',
    traceIds: [],
  };
};

const crowdProbe: Probe = ({ ctx }) => {
  if (ctx.footfall <= CROWD_CLASS_MAX.large) return null;
  return {
    id: 'risk-large-crowd',
    ruleId: 'CROWD-04',
    severity: 'info',
    title: `Over ${CROWD_CLASS_MAX.large.toLocaleString('en-IN')} people expected`,
    detail: `About ${ctx.footfall} people are expected.`,
    fix: 'Keep an ambulance on standby with a clear route and run a mock drill.',
    traceIds: [],
  };
};

const volunteerProbe: Probe = ({ ctx, volunteersNeeded }) => {
  const offered = ctx.input.community?.volunteers;
  if (volunteersNeeded === null || offered === undefined || offered >= volunteersNeeded) {
    return null;
  }
  return {
    id: 'risk-volunteers',
    ruleId: 'COM-04',
    severity: 'medium',
    title: 'Too few volunteers',
    detail: `${offered} volunteers offered; the roster needs ${volunteersNeeded}.`,
    fix: 'Ask more residents to take a role, starting with crowd marshals.',
    traceIds: [],
  };
};

const estimateProbe: Probe = ({ ctx, verdict }) => {
  if (ctx.budgetSource !== 'estimate') return null;
  return {
    id: 'risk-estimated-budget',
    ruleId: 'VER-M',
    severity: 'info',
    title: 'The budget is our estimate',
    detail: `We used ${formatLakh(ctx.budgetInr)}, the typical mid-range for a plan like this.`,
    fix: 'Enter your own budget for a real verdict.',
    traceIds: verdict.money.traceIds,
  };
};

const charityProbe: Probe = ({ ctx }) => {
  if (ctx.kind !== 'charity-fundraiser') return null;
  return {
    id: 'risk-charity-receipts',
    ruleId: 'COM-05',
    severity: 'info',
    title: 'Tax receipts need an 80G-registered trust',
    detail: 'Only a registered trust can issue tax-deductible receipts.',
    fix: "Verify the receiving trust's 80G/12A status before promising receipts.",
    traceIds: [],
  };
};

/** Diet, calendar and people probes. */
export const MORE_PROBES: readonly Probe[] = [
  jainProbe,
  pauseProbe,
  festivalProbe,
  restDayProbe,
  silenceProbe,
  peopleProbe,
  alcoholProbe,
  crowdProbe,
  volunteerProbe,
  estimateProbe,
  charityProbe,
];
