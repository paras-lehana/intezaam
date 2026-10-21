/**
 * Risk probes (RISK) — one small check per risk, each returning a risk or nothing.
 *
 * Responsibility: the individual risk checks over the built plan sections — sound curfew,
 * tradition hard rules, verdict axes, funding, space, rain and peak-season pressure,
 * and a past date — with the cause and the fix in plain words, every time and limit read
 * from its rule's constant. Boundary: detection and wording; risk-probes-money.ts holds the
 * food and rooms gaps, risk-probes-more.ts the diet, calendar and people probes, and
 * risks.ts orders them.
 */
import { FESTIVE_EXEMPTION_MAX_DAYS, NOISE_CURFEW_START_HHMM } from '../domain/permissions.js';
import type { RuleId } from '../domain/rule-ids.js';
import { PEAK_BOOKING_LEAD_MONTHS } from '../domain/seasons.js';
import { PEAK_UNBOOKED_WARNING_DAYS } from '../domain/timeline.js';
import { formatDays, formatInr } from '../format.js';
import type { CostCheck, PlanBudget, Verdict } from '../schemas/plan-money.js';
import type { FoodPlan, SpaceCheck } from '../schemas/plan-people.js';
import type { Permission, RiskSeverity } from '../schemas/plan-safety.js';
import type { DateNote, PlanTimeline } from '../schemas/plan-time.js';
import { clockLabel, toMinutes } from './clock.js';
import type { FunctionTiming } from './functions.js';
import type { NormalisedContext } from './types.js';

const MINUTES_PER_HOUR = 60;
/** The outdoor amplified-sound cut-off as readers say it ("10 pm"). */
const CURFEW = clockLabel(NOISE_CURFEW_START_HHMM);

export interface RiskDraft {
  readonly id: string;
  readonly ruleId: RuleId;
  readonly severity: RiskSeverity;
  readonly title: string;
  readonly detail: string;
  readonly fix: string;
  readonly traceIds: readonly string[];
}

export interface RiskInputs {
  readonly ctx: NormalisedContext;
  readonly verdict: Verdict;
  readonly permissions: readonly Permission[];
  readonly costCheck: CostCheck;
  /** The budget lines, so a gap is measured against the line that pays for it. */
  readonly budget: PlanBudget;
  readonly space: SpaceCheck;
  readonly food: FoodPlan;
  readonly timeline: PlanTimeline;
  readonly timings: readonly FunctionTiming[];
  readonly restDayTraceId: string | null;
  readonly volunteersNeeded: number | null;
}

export type Probe = (inputs: RiskInputs) => RiskDraft | null;

/**
 * The trace ids of the date notes of one kind (risks cite the note that raised them).
 * @example
 * noteIds(timeline.dateNotes, 'rain-risk'); // ['CTX-07.2']
 */
export function noteIds(notes: readonly DateNote[], kind: DateNote['kind']): string[] {
  return notes.filter((note) => note.kind === kind).flatMap((note) => note.traceIds);
}

const blockerProbe: Probe = ({ permissions }) => {
  const blocked = permissions.find((permission) => permission.blocker);
  if (blocked === undefined) return null;
  return {
    id: 'risk-night-sound',
    ruleId: blocked.ruleId,
    severity: 'blocker',
    title: `Outdoor amplified music after ${CURFEW} is not allowed`,
    detail: blocked.note,
    fix: `Move it into a closed hall, or end amplified music by ${CURFEW}; a state festive exemption allows midnight on at most ${FESTIVE_EXEMPTION_MAX_DAYS} notified days a year.`,
    traceIds: blocked.traceIds,
  };
};

const traditionProbe: Probe = ({ ctx, timings }) => {
  if (ctx.family !== 'wedding') return null;
  // Only an Anand Karaj is gurdwara-only: "Punjabi" alone (anandKaraj false) is not one, and
  // when the family has not said, the rule is shown as an "if" (research 09 §5.2).
  const anandKaraj = ctx.input.anandKaraj;
  if (ctx.traditionProfile?.ceremonyVenue === 'gurdwara' && anandKaraj !== false) {
    return {
      id: 'risk-anand-karaj-venue',
      ruleId: 'TL-09',
      severity: anandKaraj === true ? 'high' : 'info',
      title:
        anandKaraj === true
          ? 'The Anand Karaj takes place in a gurdwara'
          : 'If your ceremony is an Anand Karaj, it takes place in a gurdwara',
      detail: 'The four Laavan are read in a gurdwara, not at a resort or banquet hall.',
      fix: 'Book the gurdwara for the ceremony and confirm the timing with your granthi.',
      traceIds: [],
    };
  }
  const window = ctx.traditionProfile?.ceremonyWindow;
  const wedding = timings.find((timing) => timing.kind === 'wedding');
  if (window === null || window === undefined || wedding === undefined) return null;
  const start = toMinutes(wedding.startHhmm);
  const outside =
    start < toMinutes(window.startHhmm) ||
    start + wedding.durationHours * MINUTES_PER_HOUR > toMinutes(window.endHhmm);
  if (!outside) return null;
  const allowed = `${clockLabel(window.startHhmm)}–${clockLabel(window.endHhmm)}`;
  return {
    id: 'risk-church-window',
    ruleId: 'DATE-04',
    severity: 'high',
    title: `The church ceremony runs outside ${allowed}`,
    detail: `The ceremony is planned ${wedding.startHhmm}–${wedding.endHhmm}.`,
    fix: `Move the ceremony inside ${allowed}, or confirm special permission with your priest.`,
    traceIds: [],
  };
};

const timeProbe: Probe = ({ verdict, ctx }) => {
  if (ctx.dateMode === 'past') {
    return {
      id: 'risk-past-date',
      ruleId: 'VER-T',
      severity: 'high',
      title: 'The date has already passed',
      detail: verdict.time.reason,
      fix: 'Check the date you entered.',
      traceIds: verdict.time.traceIds,
    };
  }
  const severity: Record<Verdict['time']['status'], RiskSeverity | null> = {
    critical: 'high',
    compressed: 'medium',
    'on-track': null,
  };
  const level = severity[verdict.time.status];
  if (level === null) return null;
  return {
    id: 'risk-time',
    ruleId: 'VER-T',
    severity: level,
    title: level === 'high' ? 'Very little time left' : 'Some bookings are late',
    detail: verdict.time.reason,
    fix: 'Work through the "urgent" tasks first, longest lead first; consider simpler options where a task needs more time.',
    traceIds: verdict.time.traceIds,
  };
};

const moneyProbe: Probe = ({ verdict }) => {
  if (verdict.money.status !== 'stretch') return null;
  return {
    id: 'risk-money',
    ruleId: 'VER-M',
    severity: 'high',
    title: 'Needs changes — see the levers',
    detail: verdict.money.reason,
    fix: 'Pick one of the costed levers, or raise the budget.',
    traceIds: verdict.money.traceIds,
  };
};

const fundingProbe: Probe = ({ verdict }) => {
  const funding = verdict.funding;
  if (funding === undefined || funding.status !== 'gap') return null;
  return {
    id: 'risk-funding-gap',
    ruleId: 'VER-F',
    severity: 'medium',
    title: `A funding gap of ${formatInr(funding.gapInr)}`,
    detail: funding.reason,
    fix: 'Add the number of households, or approach local sponsors for stalls and banners.',
    traceIds: funding.traceIds,
  };
};

const spaceProbe: Probe = ({ space }) => {
  if (space.status !== 'over' && space.status !== 'tight') return null;
  return {
    id: 'risk-space',
    ruleId: 'SPACE-01',
    severity: space.status === 'over' ? 'high' : 'medium',
    title: space.status === 'over' ? 'The venue is too small' : 'The venue will be tight',
    detail: `About ${space.capacity ?? 0} guests fit in ${space.areaSqft ?? 0} sq ft for this layout.`,
    fix: 'Find a bigger space, split the guest list across functions, or change the layout.',
    traceIds: space.traceIds,
  };
};

const rainProbe: Probe = ({ ctx, timeline }) => {
  if (!ctx.rainRisk) return null;
  const open = ctx.setting === 'outdoor';
  return {
    id: 'risk-rain',
    ruleId: 'CTX-07',
    severity: open ? 'high' : 'medium',
    title: open
      ? 'Open-air event in the rainy months, with no cover'
      : 'Part of the event is open-air in the rainy months',
    detail: 'Rain is likely in this city in that month.',
    fix: 'Book a waterproof hangar or a covered backup space, with raised flooring and covered cables.',
    traceIds: noteIds(timeline.dateNotes, 'rain-risk'),
  };
};

const peakProbe: Probe = ({ ctx, timeline }) => {
  const unbooked = timeline.tasks.some(
    (task) =>
      task.status === 'urgent' && (task.vendorType === 'venue' || task.vendorType === 'pandit'),
  );
  const close = ctx.daysToEvent !== null && ctx.daysToEvent < PEAK_UNBOOKED_WARNING_DAYS;
  if (!ctx.season.peak || !close || !unbooked || ctx.dateMode !== 'dated') return null;
  return {
    id: 'risk-peak-unbooked',
    ruleId: 'DATE-01',
    severity: 'medium',
    title: 'Peak-season date with the venue or priest still to book',
    detail: `November–February dates fill ${PEAK_BOOKING_LEAD_MONTHS.min}–${PEAK_BOOKING_LEAD_MONTHS.max} months ahead, and fewer than ${formatDays(PEAK_UNBOOKED_WARNING_DAYS)} remain.`,
    fix: 'Book the venue and the priest this week, or consider an off-peak date.',
    traceIds: noteIds(timeline.dateNotes, 'peak-season'),
  };
};

/** Plan-level probes: hard rules, verdict axes, space, weather, timing, food. */
export const PRIMARY_PROBES: readonly Probe[] = [
  blockerProbe,
  traditionProbe,
  timeProbe,
  moneyProbe,
  fundingProbe,
  spaceProbe,
  rainProbe,
  peakProbe,
];
