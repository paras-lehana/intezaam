/**
 * Money units and numeric ranges shared by every domain table.
 *
 * Responsibility: the lakh/crore units Indian sources quote budgets in, a typed range,
 * helpers that keep the tables readable (`lakh(28)` instead of `2_800_000`), the factor a
 * published percentage change multiplies by, and the range text that copy quoting a table
 * interpolates, so a number lives in one table instead of in the table and its prose.
 * Boundary: plain arithmetic on constants; no rounding policy for computed amounts.
 */

/** ₹1 lakh = ₹1,00,000; every wedding source in research note 04 quotes totals in lakh. */
export const LAKH_INR = 100_000;

/** ₹1 crore = 100 lakh. */
export const CRORE_INR = 10_000_000;

/** A closed numeric range as the sources state it (min ≤ max). */
export interface NumberRange {
  readonly min: number;
  readonly max: number;
}

/** A range whose upper end the source leaves open ("₹1,50,000+"). */
export interface OpenRange {
  readonly min: number;
  readonly max: number | null;
}

/**
 * Converts lakh to rupees, so tables can be written the way sources print them.
 * @example
 * lakh(2.5); // 250000
 */
export function lakh(amount: number): number {
  return Math.round(amount * LAKH_INR);
}

/**
 * A rupee range from two lakh figures.
 * @example
 * lakhRange(28, 48); // { min: 2800000, max: 4800000 }
 */
export function lakhRange(min: number, max: number): NumberRange {
  return { min: lakh(min), max: lakh(max) };
}

/**
 * A plain numeric range.
 * @example
 * range(600, 750); // { min: 600, max: 750 }
 */
export function range(min: number, max: number): NumberRange {
  return { min, max };
}

/** Sources state changes per hundred ("15–20% cheaper", "10–20% wasted"). */
const PER_HUNDRED = 100;

/**
 * The multiplier for a percentage change, so a table keeps the percentage its source prints.
 * @example
 * percentFactor(10); // 1.1
 * percentFactor(-15); // 0.85
 */
export function percentFactor(changePct: number): number {
  return 1 + changePct / PER_HUNDRED;
}

/** `en-IN` grouping so quoted ranges read the way the sources print them (₹300–1,000). */
const INDIAN_GROUPING = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/**
 * A range as reader-facing text with an en dash, for rule summaries, playbook questions and
 * task reasons that quote a table; the caller adds the unit ("%", "months", "₹").
 * @example
 * rangeText(range(8, 12)); // '8–12'
 * rangeText(range(300, 1_000)); // '300–1,000'
 */
export function rangeText(band: NumberRange): string {
  return `${INDIAN_GROUPING.format(band.min)}–${INDIAN_GROUPING.format(band.max)}`;
}
