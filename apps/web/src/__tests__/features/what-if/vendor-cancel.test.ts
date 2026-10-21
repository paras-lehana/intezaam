/**
 * Responsibility: "a vendor cancels at T-n" — notice is short when fewer days are left than
 * the vendor's usual lead, and the money at stake is the plan's own milestones due by the
 * cancellation day. Boundary: expectations are read from the plan the engine built.
 */
import { describe, expect, it } from 'vitest';
import { addDaysIso } from '@intezaam/core/domain';
import {
  CANCEL_DAYS_OPTIONS,
  cancelImpact,
} from '../../../components/features/what-if/vendor-cancel';
import { planFor, samplePanel, undated } from '../panel-fixtures';

describe('cancelImpact', () => {
  it('adds up the milestones due by the cancellation day, from the plan', () => {
    const { plan } = samplePanel('jaipur-wedding');
    const vendor = plan.vendors.find((entry) =>
      entry.payments.some((payment) => payment.dueIso !== undefined),
    );
    const eventIso = plan.contextEcho.dateIso;
    if (vendor === undefined || eventIso === undefined)
      throw new Error('the wedding sample is dated with payments');
    for (const days of CANCEL_DAYS_OPTIONS) {
      const impact = cancelImpact(plan, vendor.vendorType, days);
      const cancelIso = addDaysIso(eventIso, -days) ?? '';
      const due = vendor.payments
        .filter((payment) => payment.dueIso !== undefined && payment.dueIso <= cancelIso)
        .reduce((sum, payment) => sum + payment.amountInr, 0);
      expect(impact?.cancelIso).toBe(cancelIso);
      expect(impact?.paidByThenInr).toBe(due);
      expect(impact?.shortNotice).toBe(days < (impact?.usualLeadDays ?? 0));
    }
  });

  it('calls a cancellation inside the usual booking lead short notice', () => {
    const { plan } = samplePanel('jaipur-wedding');
    const caterer = cancelImpact(plan, 'caterer', CANCEL_DAYS_OPTIONS[0]);
    expect(caterer?.usualLeadDays).toBeGreaterThan(CANCEL_DAYS_OPTIONS[0]);
    expect(caterer?.shortNotice).toBe(true);
  });

  it('has no money at stake until a date is fixed', () => {
    const { context } = samplePanel('jaipur-wedding');
    const plan = planFor(undated(context));
    const vendorType = plan.vendors[0]?.vendorType;
    if (vendorType === undefined) throw new Error('the wedding sample needs vendors');
    expect(cancelImpact(plan, vendorType, 30)).toMatchObject({
      paidByThenInr: null,
      cancelIso: null,
    });
  });

  it('is null for a vendor the plan does not use', () => {
    const { plan } = samplePanel('bengaluru-birthday');
    expect(cancelImpact(plan, 'band_baaja', 30)).toBeNull();
  });
});
