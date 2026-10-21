/**
 * Tests for domain/crowd.ts: crowd classes and NDMA check triggers.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import {
  CROWD_CHECK_IDS,
  CROWD_CHECKS,
  CROWD_CLASS_MAX,
  CROWD_CLASSES,
  crowdClassFor,
} from '../domain/crowd.js';

describe('crowd classes (CTX-06)', () => {
  it('classifies at and just above each NDMA threshold', () => {
    expect(crowdClassFor(CROWD_CLASS_MAX.small)).toBe('small');
    expect(crowdClassFor(CROWD_CLASS_MAX.small + 1)).toBe('medium');
    expect(crowdClassFor(CROWD_CLASS_MAX.medium + 1)).toBe('large');
    expect(crowdClassFor(CROWD_CLASS_MAX.large)).toBe('large');
    expect(crowdClassFor(CROWD_CLASS_MAX.large + 1)).toBe('very-large');
  });

  it('thresholds rise with the class', () => {
    expect(CROWD_CLASS_MAX.small).toBeLessThan(CROWD_CLASS_MAX.medium);
    expect(CROWD_CLASS_MAX.medium).toBeLessThan(CROWD_CLASS_MAX.large);
    expect(CROWD_CLASSES).toHaveLength(Object.keys(CROWD_CLASS_MAX).length + 1);
  });
});

describe('crowd checks (CROWD-01…05)', () => {
  it('exits and first aid always apply', () => {
    expect(CROWD_CHECKS.exits.trigger.kind).toBe('always');
    expect(CROWD_CHECKS['first-aid'].trigger.kind).toBe('always');
  });

  it('footfall triggers sit on the class thresholds', () => {
    const thresholds: readonly number[] = Object.values(CROWD_CLASS_MAX);
    for (const id of CROWD_CHECK_IDS) {
      const trigger = CROWD_CHECKS[id].trigger;
      if (trigger.kind === 'above') expect(thresholds).toContain(trigger.footfall);
    }
  });

  it('an ambulance is planned only above 1,000 people', () => {
    const ambulance = CROWD_CHECKS.ambulance.trigger;
    expect(ambulance.kind === 'above' ? ambulance.footfall : 0).toBe(CROWD_CLASS_MAX.large);
  });
});
