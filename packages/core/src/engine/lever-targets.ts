/**
 * Lever guest targets (LEV-01) — how many invitations would close the money gap.
 *
 * Responsibility: the invited count each money model aims for when a guest cut is offered —
 * wedding rows escape Needs changes (food floor at 60% of event spend) or reach the next
 * published band (09 Gap 2 §2.7); a bottom-up plan meets the low end of its estimate; any
 * plan whose food line is short fits catering into that line. Party bands use the party cap
 * (LEV-06) and a committee never cuts visitors. Boundary: targets only;
 * lever-candidates.ts prices the change and levers.ts judges it.
 */
import { CATERING_STRETCH_SHARE, type WeddingBand } from '../domain/costs.js';
import type { MoneyStatus } from '../schemas/plan-money.js';
import { cateringFloorInr } from './catering.js';
import type { CorePlan } from './core.js';
import { attendanceRate, expectedGuests } from './headcount.js';
import { BAND_BASIS_GUESTS, MIN_BILLABLE_GUESTS, weddingRow } from './money-bands.js';
import { type MoneyModel, moneyModelOf } from './money-model.js';
import { eventSpendInr } from './verdict-wedding.js';

/** The row whose minimum is the next band up, for the bands a guest cut can lift. */
const NEXT_BAND_ROW: Readonly<Record<MoneyStatus, WeddingBand | null>> = {
  stretch: null,
  'home-style': 'budget',
  lean: 'mid',
  balanced: null,
  premium: null,
};

/** LEV-01 for a short food line: the invited count whose catering fits the line. */
function foodTarget(core: CorePlan): number | null {
  const { costCheck, ctx } = core;
  // Only the food gap counts here (a rooms gap alone also reads "short"); a food line below
  // a positive mid estimate keeps the division below safe.
  if (costCheck.gapInr >= 0) return null;
  // Catering grows in step with guests, so scale the list by line ÷ mid estimate.
  return Math.floor((ctx.guests * costCheck.cateringLineInr) / costCheck.cateringInr.mid);
}

/** LEV-01 for wedding rows (09 Gap 2 §2.7): guests that escape Stretch or reach the next band. */
function rowsTarget(core: CorePlan): number | null {
  const ctx = core.ctx;
  const spend = eventSpendInr(core.budget.lines);
  const rate = attendanceRate(ctx);
  if (core.money.status === 'stretch') {
    // The food floor grows with guests, so scale expected guests until food is 60% of spend.
    const expected = Math.floor(
      (CATERING_STRETCH_SHARE * spend * expectedGuests(ctx)) / cateringFloorInr(ctx),
    );
    return Math.floor(expected / rate);
  }
  const next = NEXT_BAND_ROW[core.money.status];
  if (next === null) return null;
  const billable = Math.floor((spend * BAND_BASIS_GUESTS) / weddingRow(ctx).row[next].min);
  return billable < MIN_BILLABLE_GUESTS ? null : Math.floor(billable / rate);
}

/** A bottom-up plan under its estimate: scale the list until the budget meets the low end. */
function bottomUpTarget(core: CorePlan): number | null {
  const ctx = core.ctx;
  return ctx.budgetInr < ctx.estimate.low
    ? Math.floor((ctx.guests * ctx.budgetInr) / ctx.estimate.low)
    : null;
}

/** The band or estimate target per money model; null where a guest cut is never offered. */
const GUEST_TARGETS: Readonly<Record<MoneyModel, ((core: CorePlan) => number | null) | null>> = {
  'wedding-rows': rowsTarget,
  'bottom-up': bottomUpTarget,
  'party-bands': null,
  committee: null,
};

/**
 * LEV-01: the invited count to aim for — the money model's band or estimate target first,
 * else the count whose food fits a short catering line; null when no cut would help.
 * @example
 * guestTarget(jaipurCore); // 199 (₹7 L food line ÷ ₹10.5 L bottom-up × 300 invited)
 */
export function guestTarget(core: CorePlan): number | null {
  const byModel = GUEST_TARGETS[moneyModelOf(core.ctx)];
  if (byModel === null) return null;
  return byModel(core) ?? foodTarget(core);
}
