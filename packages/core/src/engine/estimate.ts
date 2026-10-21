/**
 * Spend estimate — what a plan like this typically costs (feature #5 and VER-M).
 *
 * Responsibility: one estimator per money model (money-model.ts), so the estimate and the
 * money verdict always read the same basis — wedding rows (weddings and the 60th) from the
 * published mid-range row for the city (or generic row × tier multiplier) per billable
 * guest, grossed up from event spend to the whole budget; party bands (first, kids' and teen
 * birthdays) by setting and size (teens × 1.2); committee events from their own budget heads
 * (community-money.ts); everything else bottom-up from catering (expected guests × per-head
 * price for the kind) grossed up by the catering share of the event's base split.
 * Boundary: estimates, never quotes.
 */
import { BASIS_POINTS_TOTAL, baseSplitFor } from '../domain/budget-splits.js';
import { type BirthdayBand, BIRTHDAY_BANDS, TEEN_BAND_FACTOR } from '../domain/costs.js';
import type { EventKind } from '../domain/events.js';
import type { InrEstimate } from '../schemas/common.js';
import { cateringRange } from './catering.js';
import { computeShares } from './budget-shares.js';
import { communityEstimate } from './community-money.js';
import { expectedGuests, partyChildren } from './headcount.js';
import { BAND_BASIS_GUESTS, billableGuests, eventSpendShareBp, weddingRow } from './money-bands.js';
import { type MoneyModel, moneyModelOf } from './money-model.js';
import type { ClassifiedContext } from './types.js';

/** The party band an estimate or verdict uses, already scaled (teens × 1.2). */
export interface PartyBand {
  readonly band: BirthdayBand;
  readonly min: number;
  /** The published maximum; an open-ended band ("₹1,50,000+") uses its minimum. */
  readonly max: number;
}

const BANDED_KINDS: Readonly<Partial<Record<EventKind, 'first-birthday' | 'kids-birthday'>>> = {
  'first-birthday': 'first-birthday',
  'kids-birthday': 'kids-birthday',
  'teen-birthday': 'kids-birthday',
};

/**
 * The published party band for a first, kids' or teen birthday: the home band at home,
 * else the first band whose size fits the children; null for kinds without bands.
 * @example
 * partyBandFor(bengaluruCtx)?.band.setting; // 'hall' (25 children)
 */
export function partyBandFor(ctx: ClassifiedContext): PartyBand | null {
  const source = BANDED_KINDS[ctx.kind];
  if (source === undefined) return null;
  const bands = BIRTHDAY_BANDS[source];
  const children = partyChildren(ctx) ?? ctx.guests;
  const outside = bands.filter((band) => band.setting !== 'home');
  const chosen =
    ctx.setting === 'home'
      ? bands.find((band) => band.setting === 'home')
      : (outside.find((band) => children <= band.guests.max) ?? outside.at(-1));
  if (chosen === undefined) return null;
  // No Indian source covers teens: kids' bands × 1.2 (grade D).
  const factor = ctx.kind === 'teen-birthday' ? TEEN_BAND_FACTOR : 1;
  const min = Math.round(chosen.inr.min * factor);
  return { band: chosen, min, max: Math.round((chosen.inr.max ?? chosen.inr.min) * factor) };
}

function weddingEstimate(ctx: ClassifiedContext): InrEstimate {
  const { row } = weddingRow(ctx);
  const billable = billableGuests(expectedGuests(ctx));
  const shareBp = eventSpendShareBp(computeShares(ctx).shares);
  // Rows are event spend for 300 guests; scale to this wedding and gross up to the whole budget.
  const gross = (amount: number): number =>
    Math.round((amount * billable * BASIS_POINTS_TOTAL) / (BAND_BASIS_GUESTS * shareBp));
  return {
    low: gross(row.mid.min),
    mid: gross((row.mid.min + row.mid.max) / 2),
    high: gross(row.mid.max),
  };
}

function bottomUpEstimate(ctx: ClassifiedContext): InrEstimate {
  // A standard caterer is the typical class (Lean and Balanced price standard).
  const catering = cateringRange(ctx, 'standard');
  // The base split's catering share: what such an event spends on food, before user toggles.
  const cateringBp = baseSplitFor(ctx.kind).shares.catering ?? BASIS_POINTS_TOTAL;
  const gross = (amount: number): number => Math.round((amount * BASIS_POINTS_TOTAL) / cateringBp);
  return { low: gross(catering.low), mid: gross(catering.mid), high: gross(catering.high) };
}

function partyEstimate(ctx: ClassifiedContext): InrEstimate {
  const party = partyBandFor(ctx);
  // Every party-bands kind has bands; the bottom-up fallback keeps the function total.
  if (party === null) return bottomUpEstimate(ctx);
  return { low: party.min, mid: Math.round((party.min + party.max) / 2), high: party.max };
}

/** One estimator per money model; a new model without an estimator is a compile error. */
const ESTIMATORS: Readonly<Record<MoneyModel, (ctx: ClassifiedContext) => InrEstimate>> = {
  'wedding-rows': weddingEstimate,
  'party-bands': partyEstimate,
  'bottom-up': bottomUpEstimate,
  committee: communityEstimate,
};

/**
 * The typical cost of the plan as described, low–mid–high, in whole rupees.
 * @example
 * estimateSpend(bengaluruCtx); // the hall band: { low: 18000, mid: 31500, high: 45000 }
 */
export function estimateSpend(ctx: ClassifiedContext): InrEstimate {
  return ESTIMATORS[moneyModelOf(ctx)](ctx);
}
