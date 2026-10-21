/**
 * "A vendor cancels at T-n": what re-booking would look like, from the plan's own numbers.
 *
 * Responsibility: for one vendor in the plan and a number of days before the event, compare
 * the days left with that vendor's usual booking lead (VEN-01 lead months), and add up the
 * payment milestones already due by then — the money to ask back under the contract.
 * Boundary: an advisory read of the plan; a cancellation is not a context change, so there
 * is nothing to apply, and amounts are the plan's estimates, never a quote.
 */
import { type VendorType, addDaysIso } from '@intezaam/core/domain';
import type { Plan, VendorChecklist } from '@intezaam/core/schemas';

/** The choices the picker offers: one week, two weeks, a month, two months before. */
export const CANCEL_DAYS_OPTIONS = [7, 14, 30, 60] as const;

/** A month of lead time in days (365.25 ÷ 12), to compare months with days left. */
const DAYS_PER_MONTH = 30.44;

export interface CancelImpact {
  readonly vendor: VendorChecklist;
  readonly daysBefore: number;
  /** The vendor's usual booking lead in days (rounded). */
  readonly usualLeadDays: number;
  /** True when the days left are shorter than the usual lead. */
  readonly shortNotice: boolean;
  /** Milestones due on or before the cancellation day; null when the plan has no date. */
  readonly paidByThenInr: number | null;
  readonly cancelIso: string | null;
}

/** ISO days compare correctly as strings (YYYY-MM-DD). */
function isOnOrBefore(dayIso: string, limitIso: string): boolean {
  return dayIso <= limitIso;
}

/**
 * The impact of one vendor cancelling `daysBefore` days before the event.
 * @example
 * cancelImpact(plan, 'caterer', 30)?.shortNotice; // true when caterers book 3+ months ahead
 */
export function cancelImpact(
  plan: Plan,
  vendorType: VendorType,
  daysBefore: number,
): CancelImpact | null {
  const vendor = plan.vendors.find((entry) => entry.vendorType === vendorType);
  if (vendor === undefined) return null;
  const usualLeadDays = Math.round(vendor.leadMonths * DAYS_PER_MONTH);
  const eventIso = plan.contextEcho.dateIso;
  const cancelIso = eventIso === undefined ? null : (addDaysIso(eventIso, -daysBefore) ?? null);
  const paidByThenInr =
    cancelIso === null
      ? null
      : vendor.payments
          .filter(
            (payment) => payment.dueIso !== undefined && isOnOrBefore(payment.dueIso, cancelIso),
          )
          .reduce((sum, payment) => sum + payment.amountInr, 0);
  return {
    vendor,
    daysBefore,
    usualLeadDays,
    shortNotice: daysBefore < usualLeadDays,
    paidByThenInr,
    cancelIso,
  };
}
