/**
 * Plan verdict (VER-T, VER-F and the two-axis card) — can this budget and date work?
 *
 * Responsibility: the time axis (on track, compressed when core tasks are past their lead,
 * critical below the family's minimum workable lead), the funding axis for community
 * events (funded, a gap or a surplus) and the assembled verdict with a headline, one
 * reason per axis and the typical-cost estimate. Boundary: judges; the money axis is
 * verdict-money.ts and the levers say what would change it.
 */
import { FAMILY_PROFILES } from '../domain/events.js';
import { formatInr, formatLakh } from '../format.js';
import type { PlanTimeline } from '../schemas/plan-time.js';
import type { TimeStatus, Verdict } from '../schemas/plan-money.js';
import type { Funding } from './funding.js';
import type { TraceLog } from './trace.js';
import type { ClassifiedContext, NormalisedContext } from './types.js';
import { MONEY_LABELS, type MoneyVerdict } from './verdict-labels.js';

export interface AxisVerdict<S extends string> {
  readonly status: S;
  readonly reason: string;
  readonly traceIds: string[];
}

export const TIME_LABELS: Readonly<Record<TimeStatus, string>> = {
  'on-track': 'On track',
  compressed: 'Compressed',
  critical: 'Critical',
};

export const FUNDING_LABELS: Readonly<Record<Funding['status'], string>> = {
  funded: 'Funded',
  gap: 'Funding gap',
  surplus: 'Surplus',
};

function timeStatus(
  ctx: ClassifiedContext,
  lateCore: number,
): { status: TimeStatus; reason: string } {
  const minimum = FAMILY_PROFILES[ctx.family].minWorkableLeadDays;
  if (ctx.dateMode === 'undated') {
    return {
      status: 'on-track',
      reason: 'Your date is not fixed yet, so tasks are undated; choose the date first.',
    };
  }
  const days = ctx.daysToEvent ?? 0;
  if (ctx.dateMode === 'past') {
    return {
      status: 'critical',
      reason: 'The date you entered has passed; only wrap-up tasks remain — check the date.',
    };
  }
  if (days < minimum) {
    return {
      status: 'critical',
      reason: `Only ${days} days left; a ${FAMILY_PROFILES[ctx.family].label.toLowerCase()} usually needs at least ${minimum} (an assumption).`,
    };
  }
  if (lateCore > 0) {
    return {
      status: 'compressed',
      reason: `${lateCore} core bookings are past their usual lead time and are scheduled as urgent.`,
    };
  }
  return { status: 'on-track', reason: 'Every core task fits its usual lead time.' };
}

/**
 * VER-T: the time axis from the timeline's core tasks and the days left.
 * @example
 * timeVerdict(ctx, timeline, trace).status; // 'compressed' when a core task is urgent
 */
export function timeVerdict(
  ctx: ClassifiedContext,
  timeline: PlanTimeline,
  trace: TraceLog,
): AxisVerdict<TimeStatus> {
  const lateCore = timeline.tasks.filter(
    (task) => task.core && (task.status === 'urgent' || task.status === 'fallback'),
  ).length;
  const { status, reason } = timeStatus(ctx, lateCore);
  const id = trace.add({
    ruleId: 'VER-T',
    inputs: [
      ['days left', ctx.daysToEvent ?? 'not fixed'],
      ['minimum workable', FAMILY_PROFILES[ctx.family].minWorkableLeadDays],
      ['late core tasks', lateCore],
    ],
    effect: `${TIME_LABELS[status]}: ${reason}`,
    sourceIds: [...FAMILY_PROFILES[ctx.family].sourceIds, 'S-IMW-2026'],
  });
  return { status, reason, traceIds: [id, ...timeline.traceIds.slice(0, 1)] };
}

/**
 * VER-F: the funding axis for a community event.
 * @example
 * fundingVerdict(funding, trace).status; // 'funded'
 */
export function fundingVerdict(funding: Funding, trace: TraceLog): AxisVerdict<Funding['status']> {
  const offsets = funding.sponsorsInr + funding.rwaFundInr + funding.ticketsInr;
  const reasons: Record<Funding['status'], string> = {
    funded: `Funded: ${formatInr(funding.perHouseholdInr ?? 0)} from each of ${funding.households ?? 0} households plus ${formatInr(offsets)} of sponsors, RWA fund and tickets covers ${formatInr(funding.plannedInr)}.`,
    gap: `Gap of ${formatInr(funding.gapInr)}: add the number of households (or more sponsors) to close it.`,
    surplus: `Surplus of ${formatInr(funding.surplusInr)}: sponsors, the RWA fund and tickets already cover the planned spend.`,
  };
  const id = trace.add({
    ruleId: 'VER-F',
    inputs: [
      ['planned', formatInr(funding.plannedInr)],
      ['sponsors', formatInr(funding.sponsorsInr)],
      ['RWA fund', formatInr(funding.rwaFundInr)],
      ['tickets', formatInr(funding.ticketsInr)],
      ['households', funding.households ?? 'not given'],
    ],
    effect: reasons[funding.status],
  });
  return { status: funding.status, reason: reasons[funding.status], traceIds: [id] };
}

/**
 * Assembles the two-axis verdict card (plus funding for community events).
 * @example
 * assembleVerdict(ctx, money, time, null).headline; // 'Balanced budget · Compressed timeline'
 */
export function assembleVerdict(
  ctx: NormalisedContext,
  money: MoneyVerdict,
  time: AxisVerdict<TimeStatus>,
  funding: { readonly verdict: AxisVerdict<Funding['status']>; readonly funding: Funding } | null,
): Verdict {
  const estimated =
    ctx.budgetSource === 'estimate'
      ? `We estimated ${formatLakh(ctx.budgetInr)}, the typical mid-range, because no budget was given. `
      : '';
  const fundingLabel = funding === null ? '' : ` · ${FUNDING_LABELS[funding.verdict.status]}`;
  return {
    money: {
      status: money.status,
      reason: `${estimated}${money.reason}`,
      traceIds: [...money.traceIds],
    },
    time: { status: time.status, reason: time.reason, traceIds: time.traceIds },
    ...(funding === null
      ? {}
      : {
          funding: {
            status: funding.verdict.status,
            gapInr: funding.funding.gapInr,
            surplusInr: funding.funding.surplusInr,
            reason: funding.verdict.reason,
            traceIds: funding.verdict.traceIds,
          },
        }),
    headline: `${MONEY_LABELS[money.status]} budget · ${TIME_LABELS[time.status]} timeline${fundingLabel}`,
    estimateInr: ctx.estimate,
  };
}
