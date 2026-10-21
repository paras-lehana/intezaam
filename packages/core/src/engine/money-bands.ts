/**
 * Wedding money bands (VER-M, 09 Gap 2 §2.4) — the published rows a wedding is compared with.
 *
 * Responsibility: velvetknot's 300-guest rows (generic tier-1 and eight cities), the tier
 * multipliers for cities without a row, the event-spend basis (rows exclude jewellery,
 * outfits and guest rooms), and the five contiguous bands: stretch (food alone would take
 * over 60% at the cheapest local caterer), home-style, lean, balanced and premium, with a
 * "close to" note within 7% of a boundary. Boundary: integer comparisons only; copy and
 * trace are written by verdict-wedding.ts.
 */
import type { BudgetCategory } from '../domain/budget-categories.js';
import { CITY_ANCHORS, type AnchorCity, type CityTier, TIER_PROFILES } from '../domain/cities.js';
import { CATERING_STRETCH_SHARE, type WeddingBand } from '../domain/costs.js';
import { lakhRange, type NumberRange } from '../domain/units.js';
import type { MoneyStatus } from '../schemas/plan-money.js';
import { PERCENT } from './percent.js';
import type { ClassifiedContext, ShareTable } from './types.js';


/** A velvetknot row: budget, mid-range and luxury totals for 300 guests and three events. */
export type VkRow = Readonly<Record<WeddingBand, NumberRange>>;

function row(budget: NumberRange, mid: NumberRange, luxury: NumberRange): VkRow {
  return { budget, mid, luxury };
}

/** Gap 2 §2.2 (S-VK-2026, grade C): the generic tier-1 row at 300 guests, in lakh. */
export const VK_GENERIC_ROW_300: VkRow = row(
  lakhRange(14, 22),
  lakhRange(28, 50),
  lakhRange(65, 120),
);

/** Gap 2 §2.2 (S-VK-2026, grade C): the eight city rows at 300 guests; mid rows = CITY_ANCHORS. */
export const VK_CITY_ROWS_300: Readonly<Record<AnchorCity, VkRow>> = {
  mumbai: row(lakhRange(18, 25), lakhRange(35, 55), lakhRange(80, 150)),
  'delhi-ncr': row(lakhRange(17, 24), lakhRange(32, 52), lakhRange(75, 140)),
  bengaluru: row(lakhRange(15, 22), lakhRange(28, 46), lakhRange(65, 120)),
  jaipur: row(lakhRange(14, 22), lakhRange(28, 48), lakhRange(70, 130)),
  hyderabad: row(lakhRange(14, 21), lakhRange(27, 45), lakhRange(62, 110)),
  chennai: row(lakhRange(12, 19), lakhRange(24, 40), lakhRange(55, 100)),
  kolkata: row(lakhRange(10, 17), lakhRange(20, 36), lakhRange(50, 90)),
  ahmedabad: row(lakhRange(12, 19), lakhRange(24, 40), lakhRange(55, 100)),
};

/** The rows are 300-guest rows (S-VK-2026), the same basis that CITY_ANCHORS uses. */
export const BAND_BASIS_GUESTS = CITY_ANCHORS.jaipur.referenceGuests;

/** Below 100 guests fixed costs dominate: VK's under-50 row equals its 100-guest row (grade D). */
export const MIN_BILLABLE_GUESTS = 100;

/**
 * Gap 2 §2.4 (grade D): cost relative to the generic tier-1 row for cities without a row —
 * tier-2 0.75 (VK Kolkata and Ahmedabad sit at 0.71–0.86), tier-3 0.60 (metro plates run
 * 40–60% above tier-3, S-RSA-2026), each rounded down to stay lenient.
 */
export const VERDICT_TIER_MULTIPLIER: Readonly<Record<CityTier, number>> = {
  metro: 1,
  tier2: 0.75,
  tier3: 0.6,
};

/** VK rows exclude trousseau, jewellery and outstation rooms, so the comparison does too. */
export const EVENT_SPEND_EXCLUDES: readonly BudgetCategory[] = [
  'jewellery',
  'attire',
  'accommodation',
];

/** Within 7% of a boundary the verdict says "close to …": VK's own row-to-row spread (D). */
export const NEAR_BOUNDARY_PCT = 7;

/** CATERING_STRETCH_SHARE as a whole percentage, so the stretch test cross-multiplies integers. */
const STRETCH_PCT = Math.round(CATERING_STRETCH_SHARE * PERCENT);

export interface WeddingRow {
  readonly row: VkRow;
  readonly place: string;
  readonly anchored: boolean;
}

function scaled(range: NumberRange, factor: number): NumberRange {
  return { min: Math.round(range.min * factor), max: Math.round(range.max * factor) };
}

/**
 * The row a wedding is compared with: the city's own row, else generic × tier multiplier.
 * @example
 * weddingRow(jaipurCtx).row.mid.min; // 2800000
 */
export function weddingRow(ctx: ClassifiedContext): WeddingRow {
  if (ctx.anchor !== null) {
    return {
      row: VK_CITY_ROWS_300[ctx.anchor],
      place: CITY_ANCHORS[ctx.anchor].label,
      anchored: true,
    };
  }
  const factor = VERDICT_TIER_MULTIPLIER[ctx.tier];
  return {
    row: {
      budget: scaled(VK_GENERIC_ROW_300.budget, factor),
      mid: scaled(VK_GENERIC_ROW_300.mid, factor),
      luxury: scaled(VK_GENERIC_ROW_300.luxury, factor),
    },
    place: `${ctx.cityName} (${TIER_PROFILES[ctx.tier].label.toLowerCase()})`,
    anchored: false,
  };
}

/**
 * Basis points of the budget that count as event spend (everything but the excluded lines).
 * @example
 * eventSpendShareBp(shares); // 9000 with the default wedding split
 */
export function eventSpendShareBp(shares: ShareTable): number {
  return Object.entries(shares).reduce(
    (sum, [category, bp]) => (EVENT_SPEND_EXCLUDES.some((x) => x === category) ? sum : sum + bp),
    0,
  );
}

/**
 * Billable guests: expected attendance, never below the 100-guest floor.
 * @example
 * billableGuests(60); // 100
 */
export function billableGuests(expected: number): number {
  return Math.max(expected, MIN_BILLABLE_GUESTS);
}

export interface BandInput {
  readonly eventSpendInr: number;
  readonly billable: number;
  readonly floorInr: number;
}

export interface BandResult {
  /** All five money statuses are wedding bands (addendum 14). */
  readonly band: MoneyStatus;
  /** The band on the other side of a boundary within 7%, if any. */
  readonly near: MoneyStatus | null;
}

/** Each boundary with the bands below and above it. */
const BOUNDARIES: readonly {
  key: WeddingBand;
  below: MoneyStatus;
  above: MoneyStatus;
}[] = [
  { key: 'budget', below: 'home-style', above: 'lean' },
  { key: 'mid', below: 'lean', above: 'balanced' },
  { key: 'luxury', below: 'balanced', above: 'premium' },
];

/**
 * Gap 2 §2.4 rules 3–7: the stretch floor first, then contiguous bands by per-guest event
 * spend, compared as `eventSpend × 300 ≥ billable × rowMin` so no float drift decides a band.
 * @example
 * classifyWeddingSpend({ eventSpendInr: 2_250_000, billable: 300, floorInr: 343_613 }, jaipurRow).band; // 'lean'
 */
export function classifyWeddingSpend(input: BandInput, vkRow: VkRow): BandResult {
  if (input.floorInr * PERCENT > STRETCH_PCT * input.eventSpendInr) {
    return { band: 'stretch', near: null };
  }
  const spend = input.eventSpendInr * BAND_BASIS_GUESTS;
  const crossed = BOUNDARIES.filter((edge) => spend >= input.billable * vkRow[edge.key].min);
  const band = crossed.at(-1)?.above ?? 'home-style';
  const near = BOUNDARIES.find((edge) => {
    const threshold = input.billable * vkRow[edge.key].min;
    return Math.abs(spend - threshold) * PERCENT < NEAR_BOUNDARY_PCT * threshold;
  });
  if (near === undefined) return { band, near: null };
  return { band, near: band === near.above ? near.below : near.above };
}
