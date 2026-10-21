/**
 * The shape of one vendor checklist entry (VEN-03) and the vendor groups each part of
 * the playbook covers.
 *
 * Responsibility: shared types for the three playbook tables, so the merged
 * `VENDOR_PLAYBOOK` is checked for completeness at compile time. Boundary: types only.
 */
import type { SourceId } from './sources.js';
import type { VendorType } from './vendors.js';

export interface PlaybookEntry {
  /** Questions to ask before booking. */
  readonly questions: readonly string[];
  /** What to get in writing (the deliverables a contract should name). */
  readonly getInWriting: readonly string[];
  readonly redFlags: readonly string[];
  readonly sourceIds: readonly SourceId[];
}

/** Venue, food, decor and capture vendors (vendor-playbook-venue.ts). */
export type VenueFoodVendor = Extract<
  VendorType,
  | 'venue'
  | 'tent_house'
  | 'caterer'
  | 'cake'
  | 'bartender'
  | 'decorator'
  | 'florist'
  | 'sound_light'
  | 'generator'
  | 'photographer'
  | 'videographer'
>;

/** Looks, music and ritual vendors (vendor-playbook-people.ts). */
export type PeopleVendor = Extract<
  VendorType,
  | 'makeup'
  | 'mehendi'
  | 'attire'
  | 'jeweller'
  | 'dj_band'
  | 'dhol'
  | 'band_baaja'
  | 'choreographer'
  | 'entertainer'
  | 'nadaswaram'
  | 'pandit'
  | 'granthi'
  | 'qazi'
  | 'church_minister'
  | 'idol_maker'
>;

/** Paper, logistics and community service vendors (vendor-playbook-services.ts). */
export type ServiceVendor = Extract<
  VendorType,
  | 'invitations'
  | 'return_gifts'
  | 'transport'
  | 'hotel'
  | 'planner'
  | 'security'
  | 'sanitation'
  | 'first_aid'
>;
