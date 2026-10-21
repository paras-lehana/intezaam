/**
 * Tests for engine/money-split.ts — exact integer splits (BUD-09).
 *
 * Responsibility: prove both splitters always add up to the total exactly, send the
 * remainder where the rule says, and handle zero weights, ties and empty input.
 * Boundary: unit tests; totals are swept rather than hand-picked.
 */
import { describe, expect, it } from 'vitest';
import { BASIS_POINTS_TOTAL, BUDGET_SPLITS } from '../domain/budget-splits.js';
import { allocateByWeights, splitByBasisPoints } from '../engine/money-split.js';

const sum = (values: Iterable<number>): number => [...values].reduce((a, b) => a + b, 0);

describe('allocateByWeights', () => {
  it('always sums to the total, for any total and weights', () => {
    const weights = [5, 3, 2, 1, 0.5];
    for (const total of [0, 1, 7, 99, 1_001, 2_500_000, 123_456_789]) {
      const parts = allocateByWeights(total, weights);
      expect(sum(parts)).toBe(total);
      parts.forEach((part) => expect(Number.isInteger(part)).toBe(true));
    }
  });

  it('gives leftover units to the largest fractions, earlier index on a tie', () => {
    expect(allocateByWeights(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(allocateByWeights(10, [1, 2])).toEqual([3, 7]);
  });

  it('gives the whole total to the first part when every weight is zero or negative', () => {
    expect(allocateByWeights(50, [0, 0])).toEqual([50, 0]);
    expect(allocateByWeights(50, [-1, 0])).toEqual([50, 0]);
  });
});

describe('splitByBasisPoints', () => {
  const wedding = Object.entries(BUDGET_SPLITS.wedding.shares).map(
    ([key, bp]) => [key, bp ?? 0] as const,
  );

  it('sums to the total exactly for every total', () => {
    for (const total of [1, 999, 10_001, 2_500_000, 2_500_003, 499_999_999]) {
      expect(sum(splitByBasisPoints(total, wedding, 'contingency').values())).toBe(total);
    }
  });

  it('sends the remainder to contingency when it holds a share', () => {
    const shares = [
      ['venue', 5_000],
      ['contingency', 5_000],
    ] as const;
    const amounts = splitByBasisPoints(1_001, shares, 'contingency');
    expect(amounts.get('venue')).toBe(Math.floor((1_001 * 5_000) / BASIS_POINTS_TOTAL));
    expect(amounts.get('contingency')).toBe(1_001 - (amounts.get('venue') ?? 0));
  });

  it('sends the remainder to the largest share (earlier on a tie) without contingency', () => {
    const shares = [
      ['venue', 3_333],
      ['catering', 3_334],
      ['decor', 3_333],
    ] as const;
    const amounts = splitByBasisPoints(10, shares, 'contingency');
    expect(sum(amounts.values())).toBe(10);
    expect(amounts.get('catering')).toBeGreaterThan(amounts.get('venue') ?? 0);
    const tied = splitByBasisPoints(
      3,
      [
        ['a', 5_000],
        ['b', 5_000],
      ],
      'z',
    );
    expect([tied.get('a'), tied.get('b')]).toEqual([2, 1]);
  });

  it('leaves an exact split untouched', () => {
    const amounts = splitByBasisPoints(10_000, wedding, 'contingency');
    wedding.forEach(([key, bp]) => expect(amounts.get(key)).toBe(bp));
  });
});
