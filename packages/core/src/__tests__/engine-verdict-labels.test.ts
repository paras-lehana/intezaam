/**
 * Tests for engine/verdict-labels.ts — the money status words.
 *
 * Responsibility: prove every money status has a label, Stretch reads "Needs changes" and no
 * label says "not feasible" (addenda 1 and 14), and the tight statuses are exactly those
 * below Balanced in the schema's cheapest-first order. Boundary: vocabulary checks.
 */
import { describe, expect, it } from 'vitest';
import { MONEY_LABELS, TIGHT_MONEY_STATUSES } from '../engine/verdict-labels.js';
import { MONEY_STATUSES } from '../schemas/plan-money.js';

describe('MONEY_LABELS', () => {
  it('labels every status without ever saying "not feasible"', () => {
    for (const status of MONEY_STATUSES) {
      expect(MONEY_LABELS[status].length).toBeGreaterThan(0);
      expect(MONEY_LABELS[status]).not.toMatch(/feasible|impossible/i);
    }
    expect(MONEY_LABELS.stretch).toBe('Needs changes');
    expect(MONEY_LABELS['home-style']).toBe('Simple & home-style');
  });
});

describe('TIGHT_MONEY_STATUSES', () => {
  it('holds exactly the statuses below Balanced', () => {
    const balanced = MONEY_STATUSES.indexOf('balanced');
    expect([...TIGHT_MONEY_STATUSES]).toEqual(MONEY_STATUSES.slice(0, balanced));
  });
});
