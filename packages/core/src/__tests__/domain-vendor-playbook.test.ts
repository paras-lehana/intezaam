/**
 * Tests for domain/vendor-playbook.ts: the playbook entries and the assumed payment schedule.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { isSourceId } from '../domain/sources.js';
import {
  DEFAULT_PAYMENT_SCHEDULE,
  DELIVERY_PAYMENT_VENDORS,
  OBSERVED_ADVANCE_PCT,
  PAYMENT_CHECKLIST,
  PAYMENT_DUE_RULES,
  PAYMENT_SCHEDULE_CONFIDENCE,
  PAYMENT_SCHEDULE_SOURCES,
  VENDOR_PLAYBOOK,
} from '../domain/vendor-playbook.js';
import { VENDOR_TYPES } from '../domain/vendors.js';

const PERCENT = 100;

describe('vendor playbook (VEN-03)', () => {
  it('every vendor has questions, written commitments, red flags and sources', () => {
    for (const type of VENDOR_TYPES) {
      const entry = VENDOR_PLAYBOOK[type];
      expect(entry.questions.length).toBeGreaterThan(0);
      expect(entry.getInWriting.length).toBeGreaterThan(0);
      expect(entry.redFlags.length).toBeGreaterThan(0);
      for (const sourceId of entry.sourceIds) expect(isSourceId(sourceId)).toBe(true);
    }
  });

  it('the venue checklist covers outside caterers, curfew, fire NOC and step-free access', () => {
    const text = VENDOR_PLAYBOOK.venue.questions.join(' ');
    for (const topic of ['outside caterer', '10 pm', 'fire NOC', 'step-free'])
      expect(text).toContain(topic);
  });
});

describe('payment schedule (VEN-04)', () => {
  it('adds up to 100% and is labelled an assumption', () => {
    expect(DEFAULT_PAYMENT_SCHEDULE.reduce((sum, m) => sum + m.pct, 0)).toBe(PERCENT);
    expect(PAYMENT_SCHEDULE_CONFIDENCE).toBe('D');
    for (const sourceId of PAYMENT_SCHEDULE_SOURCES) expect(isSourceId(sourceId)).toBe(true);
  });

  it('the advance sits inside the range vendors actually ask for', () => {
    const advance = DEFAULT_PAYMENT_SCHEDULE.find((m) => m.key === 'advance');
    expect(advance?.pct).toBeGreaterThanOrEqual(OBSERVED_ADVANCE_PCT.min);
    expect(advance?.pct).toBeLessThanOrEqual(OBSERVED_ADVANCE_PCT.max);
  });

  it('uses known due rules and lists the paperwork to ask for', () => {
    for (const milestone of DEFAULT_PAYMENT_SCHEDULE)
      expect(PAYMENT_DUE_RULES).toContain(milestone.due);
    expect(DELIVERY_PAYMENT_VENDORS).toContain('photographer');
    expect(PAYMENT_CHECKLIST.join(' ')).toContain('GST invoice');
  });
});
