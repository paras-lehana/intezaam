/**
 * Exact integer splits (BUD-09) — money and shares that always add up.
 *
 * Responsibility: split a whole-rupee total by basis points with the remainder going to one
 * named line (ported from the owner's earlier planner), and split a total over weights by
 * the largest-remainder method. Boundary: arithmetic only; the budget rules decide what
 * moves where.
 */
import { BASIS_POINTS_TOTAL } from '../domain/budget-splits.js';

/**
 * Splits `total` over weights by the largest-remainder method: each part is rounded down,
 * then the leftover units go to the largest fractions (earlier index on a tie), so the parts
 * sum to `total` exactly. When every weight is zero the first part takes the whole total.
 * @example
 * allocateByWeights(100, [1, 1, 1]); // [34, 33, 33]
 */
export function allocateByWeights(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((acc, weight) => acc + Math.max(0, weight), 0);
  if (sum <= 0) return weights.map((_, index) => (index === 0 ? total : 0));
  const quotas = weights.map((weight) => (total * Math.max(0, weight)) / sum);
  const parts = quotas.map((quota) => Math.floor(quota));
  let left = total - parts.reduce((acc, part) => acc + part, 0);
  // Efficiency: one sort over at most a few dozen entries per split.
  const order = quotas
    .map((quota, index) => ({ index, fraction: quota - Math.floor(quota) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const { index } of order) {
    if (left <= 0) break;
    parts[index] = (parts[index] ?? 0) + 1;
    left -= 1;
  }
  return parts;
}

/**
 * BUD-09: whole rupees per key from basis-point shares that sum to 10,000. Each share is
 * rounded down and the remainder goes to `remainderKey` when it holds a share, else to the
 * largest share (the earlier one on a tie), so the sum equals `total` exactly.
 * @example
 * splitByBasisPoints(1001, [['venue', 5000], ['contingency', 5000]], 'contingency');
 * // Map { 'venue' => 500, 'contingency' => 501 }
 */
export function splitByBasisPoints<K extends string>(
  total: number,
  shares: readonly (readonly [K, number])[],
  remainderKey: K,
): Map<K, number> {
  const amounts = new Map<K, number>(
    shares.map(([key, bp]) => [key, Math.floor((total * bp) / BASIS_POINTS_TOTAL)]),
  );
  const rest = total - [...amounts.values()].reduce((acc, amount) => acc + amount, 0);
  if (rest === 0) return amounts;
  const holdsShare = shares.some(([key, bp]) => key === remainderKey && bp > 0);
  const target = holdsShare ? remainderKey : largestShareKey(shares, remainderKey);
  amounts.set(target, (amounts.get(target) ?? 0) + rest);
  return amounts;
}

/** The key with the largest share; strict `>` keeps the earlier key on a tie. */
function largestShareKey<K extends string>(
  shares: readonly (readonly [K, number])[],
  fallback: K,
): K {
  let bestKey = fallback;
  let bestBp = -1;
  for (const [key, bp] of shares) {
    if (bp > bestBp) {
      bestKey = key;
      bestBp = bp;
    }
  }
  return bestKey;
}
