/**
 * Payment milestones and cash flow (VEN-04) — when each vendor is paid, and how much cash
 * is needed each month.
 *
 * Responsibility: split each vendor's budget into the assumed DEFAULT_PAYMENT_SCHEDULE (an
 * advance on booking, a second payment a month before, the balance on the day — or on
 * delivery for photographers and videographers) in exact rupees, date each milestone, and group dated
 * milestones into months. No industry standard exists, so the schedule is a labelled,
 * editable assumption. Boundary: arithmetic and dates; vendors.ts supplies amounts.
 */
import { addDaysIso, isoMonthKey } from '../domain/calendar.js';
import {
  DEFAULT_PAYMENT_SCHEDULE,
  DELIVERY_PAYMENT_VENDORS,
  MID_PAYMENT_DAYS_BEFORE,
  PAYMENT_CHECKLIST,
  PAYMENT_SCHEDULE_CONFIDENCE,
  PAYMENT_SCHEDULE_SOURCES,
  type PaymentDueRule,
} from '../domain/vendor-playbook.js';
import type { VendorType } from '../domain/vendors.js';
import { formatInr } from '../format.js';
import type { PaymentMilestone, Payments } from '../schemas/plan-money.js';
import type { VendorChecklist } from '../schemas/plan-people.js';
import { allocateByWeights } from './money-split.js';
import type { TraceLog } from './trace.js';
import type { ClassifiedContext } from './types.js';

/** The assumed split as readers see it ("30/40/30"), from the schedule the maths uses. */
export const PAYMENT_SPLIT_LABEL = DEFAULT_PAYMENT_SCHEDULE.map((milestone) => milestone.pct).join(
  '/',
);

/** Each milestone in words ("30% advance on booking, …") for the VEN-04 trace. */
const SCHEDULE_TEXT = DEFAULT_PAYMENT_SCHEDULE.map(
  (milestone) => `${milestone.pct}% ${milestone.label.toLowerCase()}`,
).join(', ');

function latest(a: string, b: string): string {
  return a > b ? a : b;
}

/** The date a milestone falls due, or null when it cannot be dated yet. */
function dueDate(
  rule: PaymentDueRule,
  ctx: ClassifiedContext,
  bookByIso: string | null,
): string | null {
  const date = ctx.dateMode === 'dated' ? ctx.dateIso : null;
  if (date === null || rule === 'on-delivery') return null;
  const booking = bookByIso ?? ctx.todayIso;
  const dueByRule: Record<Exclude<PaymentDueRule, 'on-delivery'>, string> = {
    'on-booking': booking,
    // Never before the booking itself: a late booking pays both together.
    'event-minus-30': latest(addDaysIso(date, -MID_PAYMENT_DAYS_BEFORE) ?? date, booking),
    'event-day': date,
  };
  return dueByRule[rule];
}

/**
 * VEN-04: the three milestones for one vendor, in exact rupees that sum to its budget.
 * @example
 * milestonesFor('venue', 100_000, '2026-11-01', ctx).map((m) => m.amountInr); // [30000, 40000, 30000]
 */
export function milestonesFor(
  vendorType: VendorType,
  amountInr: number,
  bookByIso: string | null,
  ctx: ClassifiedContext,
): PaymentMilestone[] {
  const onDelivery = DELIVERY_PAYMENT_VENDORS.includes(vendorType);
  const amounts = allocateByWeights(
    amountInr,
    DEFAULT_PAYMENT_SCHEDULE.map((milestone) => milestone.pct),
  );
  return DEFAULT_PAYMENT_SCHEDULE.map((milestone, index) => {
    const due: PaymentDueRule =
      milestone.key === 'balance' && onDelivery ? 'on-delivery' : milestone.due;
    const dueIso = dueDate(due, ctx, bookByIso);
    return {
      vendorType,
      key: milestone.key,
      label: due === 'on-delivery' ? 'Balance when the album or film arrives' : milestone.label,
      pct: milestone.pct,
      amountInr: amounts[index] ?? 0,
      due,
      ...(dueIso === null ? {} : { dueIso }),
    };
  });
}

/**
 * The payments section: every milestone plus cash needed per month.
 * @example
 * buildPayments(vendors, trace).cashflow.reduce((s, m) => s + m.amountInr, 0); // dated milestones only
 */
export function buildPayments(vendors: readonly VendorChecklist[], trace: TraceLog): Payments {
  const milestones = vendors.flatMap((vendor) => vendor.payments);
  const months = new Map<string, { amountInr: number; vendorTypes: Set<VendorType> }>();
  for (const milestone of milestones) {
    const month = milestone.dueIso === undefined ? undefined : isoMonthKey(milestone.dueIso);
    if (month === undefined) continue;
    const entry = months.get(month) ?? { amountInr: 0, vendorTypes: new Set<VendorType>() };
    entry.amountInr += milestone.amountInr;
    entry.vendorTypes.add(milestone.vendorType);
    months.set(month, entry);
  }
  const cashflow = [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthIso, entry]) => ({
      monthIso,
      amountInr: entry.amountInr,
      vendorTypes: [...entry.vendorTypes],
    }));
  const peak = cashflow.reduce(
    (best, month) => (month.amountInr > best ? month.amountInr : best),
    0,
  );
  const id = trace.add({
    ruleId: 'VEN-04',
    inputs: [
      ['vendors', vendors.length],
      ['months with payments', cashflow.length],
    ],
    effect: `Assumed schedule: ${SCHEDULE_TEXT}; the busiest month needs ${formatInr(peak)}.`,
    sourceIds: PAYMENT_SCHEDULE_SOURCES,
    confidence: PAYMENT_SCHEDULE_CONFIDENCE,
  });
  return {
    milestones,
    cashflow,
    assumption: PAYMENT_SCHEDULE_CONFIDENCE === 'D',
    checklist: [...PAYMENT_CHECKLIST],
    traceIds: [id],
  };
}
