/**
 * Vendor timing — how early to book (VEN-02) and how early they arrive (FN-03).
 *
 * Responsibility: wedding booking lead times per vendor (04 §3; other families take their
 * book-by dates from their own task templates), run-sheet arrival leads (01 §3.6) and the
 * share of couples who book each vendor (VEN-01 ordering). Boundary: data only.
 */
import type { SourceId } from './sources.js';
import type { Confidence } from './source-types.js';
import type { VendorType } from './vendors.js';

export interface VendorLead {
  /** Months before the wedding to book (04 §3 default, the earlier end in peak season). */
  readonly months: number;
  readonly sourceId: SourceId;
  readonly confidence: Confidence;
}

const fromImw = (months: number): VendorLead => ({
  months,
  sourceId: 'S-IMW-2026',
  confidence: 'C',
});
const fromManyavar = (months: number): VendorLead => ({
  months,
  sourceId: 'S-MANYAVAR-2024',
  confidence: 'C',
});
/** Vendors 04 §3 does not list get a lead next to the closest listed vendor (grade D). */
const assumedLead = (months: number): VendorLead => ({
  months,
  sourceId: 'S-INTEZAAM-D',
  confidence: 'D',
});

export const VENDOR_LEAD_MONTHS: Readonly<Record<VendorType, VendorLead>> = {
  venue: fromManyavar(12),
  tent_house: assumedLead(8),
  caterer: fromImw(8),
  cake: assumedLead(1),
  bartender: assumedLead(3),
  decorator: fromImw(8),
  florist: assumedLead(8),
  sound_light: assumedLead(8),
  generator: assumedLead(3),
  photographer: fromImw(11),
  videographer: fromImw(11),
  makeup: fromManyavar(7),
  mehendi: fromManyavar(6),
  attire: fromManyavar(6),
  jeweller: fromManyavar(6),
  dj_band: fromImw(8),
  dhol: assumedLead(8),
  band_baaja: assumedLead(8),
  choreographer: assumedLead(6),
  entertainer: assumedLead(8),
  nadaswaram: assumedLead(6),
  pandit: fromImw(6),
  granthi: assumedLead(6),
  qazi: assumedLead(3),
  church_minister: assumedLead(6),
  idol_maker: assumedLead(3),
  invitations: fromManyavar(5),
  return_gifts: assumedLead(3),
  transport: fromManyavar(5),
  hotel: fromManyavar(9),
  planner: fromImw(12),
  security: assumedLead(2),
  sanitation: assumedLead(2),
  first_aid: assumedLead(1),
};

/**
 * FN-03: minutes before a function starts that each vendor must be on site (owner's run
 * sheet, 01 §3.6: decor 180, makeup 150, outfits 120, catering 90, music and gifts 60,
 * photo and rituals 30; grade D). null = no run-sheet slot (rooms, printed invitations).
 */
export const VENDOR_ARRIVAL_LEAD_MIN: Readonly<Record<VendorType, number | null>> = {
  venue: 180,
  tent_house: 180,
  caterer: 90,
  cake: 90,
  bartender: 90,
  decorator: 180,
  florist: 180,
  sound_light: 180,
  generator: 180,
  photographer: 30,
  videographer: 30,
  makeup: 150,
  mehendi: 150,
  attire: 120,
  jeweller: 120,
  dj_band: 60,
  dhol: 60,
  band_baaja: 60,
  choreographer: 60,
  entertainer: 60,
  nadaswaram: 60,
  pandit: 30,
  granthi: 30,
  qazi: 30,
  church_minister: 30,
  idol_maker: 30,
  invitations: null,
  return_gifts: 60,
  transport: 30,
  hotel: null,
  planner: 180,
  security: 90,
  sanitation: 90,
  first_aid: 60,
};

/** VEN-01 ordering: share of Indian couples who booked each vendor (S-WWI-2021, grade B). */
export const VENDOR_BOOKING_SHARE_PCT: Readonly<Partial<Record<VendorType, number>>> = {
  photographer: 77,
  makeup: 71,
  mehendi: 69,
  videographer: 67,
  decorator: 63,
};
