/**
 * Tests for engine/payments.ts — payment milestones and cash flow (VEN-04).
 *
 * Responsibility: prove milestones follow the assumed schedule in exact rupees, the balance
 * for photographers waits for delivery, the mid payment is never before the booking, undated
 * plans have no due dates, and cash flow sums the dated milestones by month. Boundary:
 * expectations come from DEFAULT_PAYMENT_SCHEDULE.
 */
import { describe, expect, it } from 'vitest';
import { addDaysIso, isoMonthKey } from '../domain/calendar.js';
import {
  DEFAULT_PAYMENT_SCHEDULE,
  MID_PAYMENT_DAYS_BEFORE,
  PAYMENT_CHECKLIST,
} from '../domain/vendor-playbook.js';
import { buildPayments, milestonesFor } from '../engine/payments.js';
import { createTraceLog } from '../engine/trace.js';
import { paymentsSchema } from '../schemas/plan-money.js';
import type { VendorChecklist } from '../schemas/plan-people.js';
import { classified, inDays, TODAY, undated, wedding } from './fixtures/engine-contexts.js';

const dated = classified(wedding({ dateIso: inDays(200) }));
const date = dated.dateIso ?? '';

describe('milestonesFor', () => {
  it('splits the amount by the schedule in exact rupees', () => {
    const milestones = milestonesFor('venue', 100_001, inDays(10), dated);
    expect(milestones.map((m) => m.pct)).toEqual(DEFAULT_PAYMENT_SCHEDULE.map((m) => m.pct));
    expect(milestones.reduce((sum, m) => sum + m.amountInr, 0)).toBe(100_001);
  });

  it('dates the advance at booking, the mid payment a month before and the balance on the day', () => {
    const [advance, mid, balance] = milestonesFor('venue', 1_000, inDays(10), dated);
    expect(advance?.dueIso).toBe(inDays(10));
    expect(mid?.dueIso).toBe(addDaysIso(date, -MID_PAYMENT_DAYS_BEFORE));
    expect(balance?.dueIso).toBe(date);
  });

  it('never puts the mid payment before the booking', () => {
    const close = classified(wedding({ dateIso: inDays(20) }));
    const [, mid] = milestonesFor('venue', 1_000, TODAY, close);
    expect(mid?.dueIso).toBe(TODAY);
  });

  it('waits for delivery to pay a photographer’s balance, undated', () => {
    const balance = milestonesFor('photographer', 1_000, inDays(10), dated).at(-1);
    expect([balance?.due, balance?.dueIso]).toEqual(['on-delivery', undefined]);
  });

  it('uses today as the booking date when no book-by date is known', () => {
    expect(milestonesFor('venue', 1_000, null, dated)[0]?.dueIso).toBe(TODAY);
  });

  it('leaves every milestone undated while the date is open', () => {
    const open = classified(undated(wedding()));
    expect(milestonesFor('venue', 1_000, null, open).every((m) => m.dueIso === undefined)).toBe(
      true,
    );
  });
});

describe('buildPayments', () => {
  const vendor = (vendorType: VendorChecklist['vendorType'], amount: number): VendorChecklist => ({
    vendorType,
    label: vendorType,
    group: 'venue',
    leadMonths: 1,
    budgetCategory: 'venue',
    gstPct: null,
    questions: [],
    getInWriting: [],
    redFlags: [],
    payments: milestonesFor(vendorType, amount, inDays(10), dated),
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=x',
    status: 'to-contact',
    traceIds: [],
  });

  it('sums the dated milestones by month and keeps the checklist', () => {
    const vendors = [vendor('venue', 90_000), vendor('photographer', 30_000)];
    const payments = buildPayments(vendors, createTraceLog());
    expect(paymentsSchema.safeParse(payments).success).toBe(true);
    const dated = payments.milestones.filter((m) => m.dueIso !== undefined);
    expect(payments.cashflow.reduce((sum, month) => sum + month.amountInr, 0)).toBe(
      dated.reduce((sum, m) => sum + m.amountInr, 0),
    );
    const months = payments.cashflow.map((month) => month.monthIso);
    expect([...months].sort()).toEqual(months);
    expect(months).toContain(isoMonthKey(date));
    expect(payments.checklist).toEqual([...PAYMENT_CHECKLIST]);
    expect(payments.assumption).toBe(true);
  });
});
