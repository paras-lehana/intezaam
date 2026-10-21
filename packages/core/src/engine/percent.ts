/**
 * Percent units — the two conversions every engine shares.
 *
 * Responsibility: one definition of "per cent" and of basis points per percentage point, so
 * a GST rate in per cent, a share in basis points and a price factor convert the same way
 * in every rule family (and in the web, through the engine barrel). Boundary: constants
 * only; display formatting stays in format.ts.
 */
import { BASIS_POINTS_TOTAL } from '../domain/budget-splits.js';

/** Rates such as GST 18% and shares such as a 40% outstation share are stored per hundred. */
export const PERCENT = 100;

/** 10,000 bp is 100%, so one percentage point is 100 bp. */
export const BP_PER_PERCENT = BASIS_POINTS_TOTAL / PERCENT;
