/**
 * Money-tab wording: shares, cost types and GST rates as readers expect them.
 *
 * Responsibility: basis points as a percentage with one decimal, a published rate, the
 * three cost types in words, and a GST rate (or "not estimated" where the research has no
 * rate). Boundary: display only.
 */
import { BASIS_POINTS_TOTAL, type CostType } from '@intezaam/core/domain';

/** 10,000 basis points make 100%, so one percent is a hundred basis points. */
const BP_PER_PERCENT = BASIS_POINTS_TOTAL / 100;

const ONE_DECIMAL = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });
/** Rates such as a 10.25% service-plus-GST load keep their two published decimals. */
const TWO_DECIMALS = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export const COST_TYPE_LABELS: Readonly<Record<CostType, string>> = {
  fixed: 'Fixed',
  'per-guest': 'Per guest',
  mixed: 'Mixed',
};

/**
 * Basis points as a percentage.
 * @example
 * formatShare(1727); // '17.3%'
 */
export function formatShare(bp: number): string {
  return `${ONE_DECIMAL.format(bp / BP_PER_PERCENT)}%`;
}

/**
 * A rate in percent, as published.
 * @example
 * formatPercent(10.25); // '10.25%'
 */
export function formatPercent(pct: number): string {
  return `${TWO_DECIMALS.format(pct)}%`;
}

/**
 * A GST rate, or the honest "not estimated" when the research has none (CST-06).
 * @example
 * formatGstRate(18); // '18%'
 * formatGstRate(null); // 'Not estimated'
 */
export function formatGstRate(ratePct: number | null): string {
  return ratePct === null ? 'Not estimated' : formatPercent(ratePct);
}
