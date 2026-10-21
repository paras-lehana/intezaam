/**
 * Tests for domain/vendor-timing.ts: booking leads, arrival leads and booking shares.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { isSourceId } from '../domain/sources.js';
import {
  VENDOR_ARRIVAL_LEAD_MIN,
  VENDOR_BOOKING_SHARE_PCT,
  VENDOR_LEAD_MONTHS,
} from '../domain/vendor-timing.js';
import { VENDOR_TYPES } from '../domain/vendors.js';

/** 04 §3: the longest published wedding lead is 12 months. */
const LONGEST_LEAD_MONTHS = 12;
/** Nobody arrives more than a few hours early; decor's 3 hours is the longest (FN-03). */
const LONGEST_ARRIVAL_MIN = 180;
const PERCENT = 100;

describe('vendor timing', () => {
  it('booking leads are positive, at most 12 months and graded by their source', () => {
    for (const type of VENDOR_TYPES) {
      const lead = VENDOR_LEAD_MONTHS[type];
      expect(lead.months).toBeGreaterThan(0);
      expect(lead.months).toBeLessThanOrEqual(LONGEST_LEAD_MONTHS);
      expect(isSourceId(lead.sourceId)).toBe(true);
      expect(lead.confidence).toBe(lead.sourceId === 'S-INTEZAAM-D' ? 'D' : 'C');
    }
  });

  it('the venue and planner are booked first (04 §3)', () => {
    expect(VENDOR_LEAD_MONTHS.venue.months).toBe(LONGEST_LEAD_MONTHS);
    expect(VENDOR_LEAD_MONTHS.planner.months).toBe(LONGEST_LEAD_MONTHS);
  });

  it('arrival leads are positive and decor arrives first (FN-03)', () => {
    for (const type of VENDOR_TYPES) {
      const lead = VENDOR_ARRIVAL_LEAD_MIN[type];
      if (lead !== null) {
        expect(lead).toBeGreaterThan(0);
        expect(lead).toBeLessThanOrEqual(LONGEST_ARRIVAL_MIN);
      }
    }
    expect(VENDOR_ARRIVAL_LEAD_MIN.decorator).toBe(LONGEST_ARRIVAL_MIN);
  });

  it('booking shares are percentages, photographers most booked (VEN-01)', () => {
    const shares = Object.values(VENDOR_BOOKING_SHARE_PCT);
    for (const share of shares) expect(share).toBeLessThanOrEqual(PERCENT);
    expect(VENDOR_BOOKING_SHARE_PCT.photographer).toBe(Math.max(...shares));
  });
});
