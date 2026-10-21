/**
 * Scale bands (CTX-03) — intimate, mid-size or large by guest count.
 *
 * Responsibility: the band thresholds the budget shift (BUD-02) and the wedding cost
 * matrix are keyed by, and the classifier that applies them.
 * Boundary: classification only.
 */

export const SCALE_BANDS = ['intimate', 'mid', 'large'] as const;

export type ScaleBand = (typeof SCALE_BANDS)[number];

/** Under 100 guests is intimate (the VK 100-guest row anchors the band). */
export const INTIMATE_BELOW_GUESTS = 100;

/** Over 300 guests is large (the VK 300 and 400+ rows anchor the band). */
export const LARGE_ABOVE_GUESTS = 300;

export const SCALE_LABELS: Readonly<Record<ScaleBand, string>> = {
  intimate: 'Intimate (under 100 guests)',
  mid: 'Mid-size (100–300 guests)',
  large: 'Large (over 300 guests)',
};

/**
 * CTX-03: the scale band for a guest count.
 * @example
 * scaleBandFor(300); // 'mid'
 * scaleBandFor(301); // 'large'
 */
export function scaleBandFor(guests: number): ScaleBand {
  if (guests < INTIMATE_BELOW_GUESTS) return 'intimate';
  return guests > LARGE_ABOVE_GUESTS ? 'large' : 'mid';
}
