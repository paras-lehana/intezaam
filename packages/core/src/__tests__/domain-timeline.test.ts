/**
 * Tests for domain/timeline.ts: phase labels and lead-time arithmetic.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { EVENT_FAMILIES } from '../domain/events.js';
import {
  COMPRESSION_STEP_DAYS,
  DAYS_PER_MONTH,
  DAYS_PER_WEEK,
  monthsToDays,
  PHASE_LABELS,
  TIMELINE_PHASES,
  weeksToDays,
} from '../domain/timeline.js';

describe('timeline phases', () => {
  it('has eight phases, each labelled with a window for every family', () => {
    expect(TIMELINE_PHASES).toHaveLength(8);
    for (const phase of TIMELINE_PHASES) {
      expect(PHASE_LABELS[phase].label.length).toBeGreaterThan(0);
      for (const family of EVENT_FAMILIES) {
        expect(PHASE_LABELS[phase].windowByFamily[family].length).toBeGreaterThan(0);
      }
    }
  });
});

describe('lead-time arithmetic (TL-02)', () => {
  it('converts months with 30.4375 days a month, rounded', () => {
    expect(monthsToDays(12)).toBe(Math.round(12 * DAYS_PER_MONTH));
    expect(monthsToDays(0.25)).toBe(Math.round(0.25 * DAYS_PER_MONTH));
    expect(DAYS_PER_MONTH * 12).toBeCloseTo(365.25);
  });

  it('converts weeks to days', () => {
    expect(weeksToDays(6)).toBe(6 * DAYS_PER_WEEK);
  });

  it('compression steps are ordered (TL-03)', () => {
    expect(COMPRESSION_STEP_DAYS.min).toBeLessThan(COMPRESSION_STEP_DAYS.max);
  });
});
