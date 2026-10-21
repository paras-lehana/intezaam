/**
 * VENDOR_PLAYBOOK (VEN-03) and the default payment schedule (VEN-04).
 *
 * Responsibility: merge the three playbook parts into one table keyed by every vendor
 * type, and define the assumed payment milestones. No industry standard exists for
 * vendor advances (listings state 20–70%), so 30/40/30 is a labelled, editable
 * assumption. Boundary: data only; the vendor engine attaches amounts and dates.
 */
import type { SourceId } from './sources.js';
import type { Confidence } from './source-types.js';
import { range } from './units.js';
import type { PlaybookEntry } from './vendor-playbook-types.js';
import { PEOPLE_PLAYBOOK } from './vendor-playbook-people.js';
import { SERVICES_PLAYBOOK } from './vendor-playbook-services.js';
import { VENUE_FOOD_PLAYBOOK } from './vendor-playbook-venue.js';
import type { VendorType } from './vendors.js';

export const VENDOR_PLAYBOOK: Readonly<Record<VendorType, PlaybookEntry>> = {
  ...VENUE_FOOD_PLAYBOOK,
  ...PEOPLE_PLAYBOOK,
  ...SERVICES_PLAYBOOK,
};

/** When a milestone falls due, relative to booking, the event or delivery. */
export const PAYMENT_DUE_RULES = [
  'on-booking',
  'event-minus-30',
  'event-day',
  'on-delivery',
] as const;

export type PaymentDueRule = (typeof PAYMENT_DUE_RULES)[number];

export interface PaymentMilestoneTemplate {
  readonly key: 'advance' | 'mid' | 'balance';
  readonly label: string;
  readonly pct: number;
  readonly due: PaymentDueRule;
}

/** VEN-04 default (grade D): 30% on booking · 40% by T−30 days · 30% on the day. */
export const DEFAULT_PAYMENT_SCHEDULE: readonly PaymentMilestoneTemplate[] = [
  { key: 'advance', label: 'Advance on booking', pct: 30, due: 'on-booking' },
  { key: 'mid', label: 'Second payment a month before', pct: 40, due: 'event-minus-30' },
  { key: 'balance', label: 'Balance on the day', pct: 30, due: 'event-day' },
];

/** Photographers and videographers are paid the balance when the album or film arrives. */
export const DELIVERY_PAYMENT_VENDORS: readonly VendorType[] = ['photographer', 'videographer'];

/** Days before the event the mid payment falls due (VEN-04). */
export const MID_PAYMENT_DAYS_BEFORE = 30;

export const PAYMENT_SCHEDULE_SOURCES: readonly SourceId[] = [
  'S-VENDOR-ADVANCE-2026',
  'S-LAWRATO-ND',
];
export const PAYMENT_SCHEDULE_CONFIDENCE: Confidence = 'D';

/** Advances stated in the sampled vendor listings ranged from 20% to 70% (S-VENDOR-ADVANCE-2026). */
export const OBSERVED_ADVANCE_PCT = range(20, 70);

/** Ask for these with every payment; a blanket forfeit of an advance is not automatically enforceable. */
export const PAYMENT_CHECKLIST: readonly string[] = [
  'A written receipt for every payment',
  'A refund and cancellation clause',
  'A GST invoice',
];
