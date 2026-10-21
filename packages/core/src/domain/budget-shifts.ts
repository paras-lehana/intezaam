/**
 * Budget shifts (BUD-02…08) — the adjustments applied on top of a base split.
 *
 * Responsibility: the basis-point moves for wedding scale, destination weddings and
 * outstation guests, the priority shift, the opt-in jewellery and planner shares and the
 * home-party venue share. Every shift table nets to zero so a split keeps summing to
 * 10,000. Boundary: data only; the budget engine applies these in order with a trace.
 */
import type { SplitBp } from './budget-splits.js';
import type { ScaleBand } from './scale.js';
import { range } from './units.js';

/** BUD-02 (wedding only, grade D): small weddings spend less on plates, more on fixed lines. */
export const SCALE_SPLIT_SHIFTS_BP: Readonly<Record<ScaleBand, SplitBp>> = {
  intimate: {
    catering: -500,
    venue: -200,
    gifts: -100,
    photo_video: 300,
    attire: 300,
    makeup: 100,
    decor: 100,
  },
  mid: {},
  large: {
    catering: 500,
    venue: 200,
    gifts: 100,
    photo_video: -300,
    attire: -300,
    makeup: -100,
    decor: -100,
  },
};

/**
 * BUD-03: destination weddings move 8 points from decor and hospitality into venue and
 * travel (S-WP-2026 gives the 8–10 point direction). Hospitality here is guest rooms,
 * which a destination venue usually bundles; the per-category split is our assumption.
 * No line goes below zero even after the intimate or large scale shift.
 */
export const DESTINATION_SHIFT_BP: SplitBp = {
  decor: -600,
  accommodation: -200,
  venue: 500,
  transport: 300,
};

/** BUD-04: guest rooms rise to 8–10% when most guests are outstation (S-WP-2026). */
export const OUTSTATION_ACCOMMODATION_BP = range(800, 1_000);
export const OUTSTATION_ACCOMMODATION_DEFAULT_BP = 900;

/** BUD-05: each top-3 priority gains up to 3 points. */
export const PRIORITY_SHIFT_BP = 300;

/** BUD-06: jewellery is 15% of national wedding spend (CAIT), so core lines scale by 0.85. */
export const JEWELLERY_SHARE_OF_TOTAL = 0.15;

/** BUD-06: a planner costs 5–10% of the budget (S-VK-2026); 8% is our default. */
export const PLANNER_SHARE_BP = range(500, 1_000);
export const PLANNER_DEFAULT_BP = 800;

/** BUD-08: a birthday at home keeps 5% for venue (chairs, rentals) and spreads the rest. */
export const HOME_PARTY_VENUE_BP = 500;
