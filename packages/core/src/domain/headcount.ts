/**
 * Headcount constants (HC-01…03) — from invited to expected, plated and cooked-for.
 *
 * Responsibility: attendance rates, the plate-guarantee and cook-for factors, the waste
 * warning threshold and the waste share behind it, rooms per outstation guest, and the
 * kids'-party return-gift buffer and the missing-replies figure behind it. Boundary: constants only; no India-specific attendance study exists,
 * so every rate is a grade-D default the user can override.
 */
import type { NumberRange } from './units.js';
import { range } from './units.js';

/** A default plus the range the sources span, so the UI can show "0.80 (0.75–0.90)". */
export interface RateDefault {
  readonly value: number;
  readonly range: NumberRange;
}

/** HC-01: share of invited guests who attend an in-town event (forum anecdotes; grade D). */
export const ATTENDANCE_IN_TOWN: RateDefault = { value: 0.8, range: range(0.75, 0.9) };

/** HC-01: destination events see more declines (same forum; grade D). */
export const ATTENDANCE_DESTINATION: RateDefault = { value: 0.65, range: range(0.55, 0.75) };

/** HC-02: guarantee the caterer 95% of expected plates — venues bill the guarantee anyway. */
export const PLATE_GUARANTEE_FACTOR = 0.95;

/** HC-02: cook for expected × 1.05, the chef's safety buffer (S-HASSANCHEF-2026). */
export const COOK_FOR_FACTOR = 1.05;

/** HC-02: warn above expected × 1.10, because wedding food is already wasted (S-DTE-2018). */
export const WASTE_WARNING_FACTOR = 1.1;

/** HC-02's reason, quoted in its rule: about 10–15% of wedding food is wasted (Feeding India, S-DTE-2018). */
export const WEDDING_FOOD_WASTE_PCT = range(10, 15);

/** CST-05 /: rooms = ceil(outstation guests ÷ 2), two guests sharing a room. */
export const GUESTS_PER_ROOM = 2;

/** HC-03: order 10–15% more return gifts than confirmed children (S-CHARMBOX-2026). */
export const RETURN_GIFT_BUFFER_PCT = range(10, 15);

/** HC-03's reason, quoted in its rule: 82% of party-throwing parents did not hear back from every guest (US poll, S-QUIRKS-ND). */
export const PARENTS_MISSING_RSVPS_PCT = 82;

/** BUD-04: when more than half the guests travel in, accommodation gets its own weight. */
export const OUTSTATION_HEAVY_SHARE = 0.5;
