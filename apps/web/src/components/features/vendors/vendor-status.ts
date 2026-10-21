/**
 * Where each vendor stands — to contact, quoted, booked, paid — remembered on this device.
 *
 * Responsibility: the status words (a closed table over core's VENDOR_STATUSES) and the
 * guarded, validated storage of the reader's choices, keyed by vendor type so a re-plan
 * keeps them. Boundary: nothing here is sent anywhere; the plan's own status is the
 * starting value.
 */
import { z } from 'zod';
import { VENDOR_TYPES, type VendorType } from '@intezaam/core/domain';
import { VENDOR_STATUSES } from '@intezaam/core/schemas';
import { storePreference } from '../../../lib/preferences';
import { readStored } from '../common/stored-json';

export type VendorStatus = (typeof VENDOR_STATUSES)[number];

export const VENDOR_STATUS_LABELS: Readonly<Record<VendorStatus, string>> = {
  'to-contact': 'To contact',
  quoted: 'Quote received',
  booked: 'Booked',
  paid: 'Paid in full',
};

export type VendorStatusBook = Readonly<Partial<Record<VendorType, VendorStatus>>>;

export const VENDOR_STATUS_STORAGE_KEY = 'intezaam:vendor-status';

const statusBookSchema = z.partialRecord(z.enum(VENDOR_TYPES), z.enum(VENDOR_STATUSES));

/**
 * Narrows a select's value to a vendor status.
 * @example
 * asVendorStatus('booked'); // 'booked'
 * asVendorStatus('maybe'); // undefined
 */
export function asVendorStatus(value: string): VendorStatus | undefined {
  return VENDOR_STATUSES.find((status) => status === value);
}

/**
 * The statuses chosen on this device; empty when absent, blocked or malformed.
 * @example
 * readVendorStatuses(); // {} on a first visit
 */
export function readVendorStatuses(): VendorStatusBook {
  return readStored(VENDOR_STATUS_STORAGE_KEY, statusBookSchema, {});
}

/**
 * Remembers the statuses on this device.
 * @example
 * storeVendorStatuses({ venue: 'booked' });
 */
export function storeVendorStatuses(book: VendorStatusBook): void {
  storePreference(VENDOR_STATUS_STORAGE_KEY, JSON.stringify(book));
}
