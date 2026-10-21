/**
 * Tests for domain/ceremonies.ts: ceremony sequences: functions, vendors, order, officiants.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { CEREMONY_SEQUENCES } from '../domain/ceremonies.js';
import { functionAllowedFor } from '../domain/functions.js';
import { TRADITION_PROFILES, TRADITIONS } from '../domain/traditions.js';
import { VENDOR_TYPES } from '../domain/vendors.js';

describe('ceremony sequences', () => {
  it('every step names a wedding function (or none) and known vendors', () => {
    for (const tradition of TRADITIONS) {
      for (const step of CEREMONY_SEQUENCES[tradition]) {
        if (step.functionKind !== null)
          expect(functionAllowedFor(step.functionKind, 'wedding')).toBe(true);
        for (const vendor of step.vendors) expect(VENDOR_TYPES).toContain(vendor);
      }
    }
  });

  it('keys are unique within a tradition and steps are in day order', () => {
    for (const tradition of TRADITIONS) {
      const steps = CEREMONY_SEQUENCES[tradition];
      expect(new Set(steps.map((step) => step.key)).size).toBe(steps.length);
      const days = steps.map((step) => step.dayOffset);
      expect(days).toEqual([...days].sort((a, b) => a - b));
    }
  });

  it('every religious tradition has a main-day rite performed by its officiant', () => {
    for (const tradition of TRADITIONS) {
      const officiant = TRADITION_PROFILES[tradition].officiant;
      if (officiant === null) continue;
      const mainDay = CEREMONY_SEQUENCES[tradition].filter((step) => step.dayOffset === 0);
      expect(mainDay.some((step) => step.vendors.includes(officiant))).toBe(true);
    }
  });

  it('marks common-practice steps as assumed', () => {
    const assumed = TRADITIONS.flatMap((t) => CEREMONY_SEQUENCES[t].filter((step) => step.assumed));
    expect(assumed.length).toBeGreaterThan(0);
    expect(CEREMONY_SEQUENCES.muslim.find((step) => step.key === 'nikah')?.assumed).toBe(false);
  });
});
