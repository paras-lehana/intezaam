/**
 * Reader-facing number formatting (rupees, lakh/crore, days, months, percentages).
 *
 * Responsibility: one place that turns plan numbers into the strings the web, the share
 * text and the offline narrator interpolate, using Indian digit grouping (₹1,50,000) and
 * the lakh/crore shorthand families use when they talk about budgets ("₹25 L").
 * Boundary: formatting only — rounding beyond display precision is the engine's job.
 */
import { CRORE_INR, LAKH_INR } from './domain/units.js';

const RUPEE_SIGN = '₹';

/** `en-IN` gives lakh/crore grouping (1,50,000) — the grouping Indian readers expect. */
const INDIAN_GROUPING = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** Lakh and crore shorthand keeps one decimal ("₹2.5 L"); more reads as false precision. */
const SHORTHAND_FORMAT = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });

/** Percentages and month counts rarely need more than two decimals (8.75%, 0.25 months). */
const DECIMAL_FORMAT = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/** Negative amounts (savings, deficits) keep their sign in front of the rupee symbol. */
function signOf(amount: number): string {
  return amount < 0 ? '-' : '';
}

/**
 * Formats rupees with Indian digit grouping, rounded to whole rupees.
 * @example
 * formatInr(150000); // '₹1,50,000'
 * formatInr(-2500); // '-₹2,500'
 */
export function formatInr(amount: number): string {
  return `${signOf(amount)}${RUPEE_SIGN}${INDIAN_GROUPING.format(Math.abs(Math.round(amount)))}`;
}

/**
 * Formats rupees in the lakh/crore shorthand, falling back to full digits below one lakh.
 * @example
 * formatLakh(2_500_000); // '₹25 L'
 * formatLakh(12_000_000); // '₹1.2 Cr'
 * formatLakh(45_000); // '₹45,000'
 */
export function formatLakh(amount: number): string {
  const magnitude = Math.abs(amount);
  if (magnitude >= CRORE_INR) {
    return `${signOf(amount)}${RUPEE_SIGN}${SHORTHAND_FORMAT.format(magnitude / CRORE_INR)} Cr`;
  }
  if (magnitude >= LAKH_INR) {
    return `${signOf(amount)}${RUPEE_SIGN}${SHORTHAND_FORMAT.format(magnitude / LAKH_INR)} L`;
  }
  return formatInr(amount);
}

/**
 * Formats a rupee range in shorthand, collapsing equal ends to one value.
 * @example
 * formatInrRange(2_800_000, 4_800_000); // '₹28 L–₹48 L'
 */
export function formatInrRange(min: number, max: number): string {
  const low = formatLakh(min);
  const high = formatLakh(max);
  return low === high ? low : `${low}–${high}`;
}

/**
 * Formats a day count with the right plural.
 * @example
 * formatDays(1); // '1 day'
 */
export function formatDays(days: number): string {
  return `${INDIAN_GROUPING.format(days)} ${days === 1 ? 'day' : 'days'}`;
}

/**
 * Formats a month count with the right plural.
 * @example
 * formatMonths(12); // '12 months'
 */
export function formatMonths(months: number): string {
  return `${DECIMAL_FORMAT.format(months)} ${months === 1 ? 'month' : 'months'}`;
}

/**
 * Formats a percentage with up to two decimals.
 * @example
 * formatPercent(8.5); // '8.5%'
 */
export function formatPercent(percent: number): string {
  return `${DECIMAL_FORMAT.format(percent)}%`;
}

/**
 * Shortens text to at most `max` characters on a word boundary, adding an ellipsis.
 * Keeps model and rule text inside schema bounds instead of failing validation.
 * @example
 * clipText('one two three', 9); // 'one two…'
 */
export function clipText(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const slice = trimmed.slice(0, Math.max(0, max - 1));
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trimEnd()}…`;
}
