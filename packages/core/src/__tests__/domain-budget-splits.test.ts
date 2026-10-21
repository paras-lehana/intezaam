/**
 * Tests for domain/budget-splits.ts: that every base split sums to 10,000 basis points.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { BUDGET_CATEGORIES } from '../domain/budget-categories.js';
import {
  BASIS_POINTS_TOTAL,
  BUDGET_SPLITS,
  baseSplitFor,
  KIND_SPLIT_OVERRIDES,
  type SplitBp,
} from '../domain/budget-splits.js';
import { EVENT_KIND_PROFILES } from '../domain/event-kinds.js';
import { EVENT_FAMILIES, EVENT_KINDS, FAMILY_PROFILES } from '../domain/events.js';
import { isSourceId } from '../domain/sources.js';

function total(shares: SplitBp): number {
  return BUDGET_CATEGORIES.reduce((sum, category) => sum + (shares[category] ?? 0), 0);
}

const allRows = [
  ...EVENT_FAMILIES.map((family) => BUDGET_SPLITS[family]),
  ...EVENT_KINDS.flatMap((kind) => {
    const row = KIND_SPLIT_OVERRIDES[kind];
    return row === undefined ? [] : [row];
  }),
];

describe('base splits (BUD-01)', () => {
  it('every family and every kind override sums to exactly 10,000 basis points', () => {
    for (const row of allRows) expect(total(row.shares)).toBe(BASIS_POINTS_TOTAL);
  });

  it('uses whole, positive basis points and registered sources', () => {
    for (const row of allRows) {
      for (const share of Object.values(row.shares)) {
        expect(Number.isInteger(share)).toBe(true);
        expect(share).toBeGreaterThan(0);
      }
      for (const sourceId of row.sourceIds) expect(isSourceId(sourceId)).toBe(true);
    }
  });

  it('wedding and community splits already meet their contingency floor (BUD-07)', () => {
    for (const family of ['wedding', 'community'] as const) {
      const contingency = BUDGET_SPLITS[family].shares.contingency ?? 0;
      expect(contingency).toBeGreaterThanOrEqual(FAMILY_PROFILES[family].contingencyFloorBp);
    }
  });

  it('baseSplitFor prefers a kind override and falls back to the family row', () => {
    expect(baseSplitFor('home-puja')).toBe(KIND_SPLIT_OVERRIDES['home-puja']);
    expect(baseSplitFor('wedding')).toBe(BUDGET_SPLITS.wedding);
    expect(baseSplitFor('kids-birthday')).toBe(BUDGET_SPLITS.birthday);
  });

  it('only overrides kinds whose family row would misfit', () => {
    for (const kind of EVENT_KINDS) {
      if (KIND_SPLIT_OVERRIDES[kind] === undefined) continue;
      expect(['birthday', 'family-function']).toContain(EVENT_KIND_PROFILES[kind].family);
    }
  });
});
