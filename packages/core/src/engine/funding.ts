/**
 * Community funding (VER-F, COM-01, COM-02) — who pays for a community event.
 *
 * Responsibility: offsets (sponsors, RWA fund, tickets), the net left for households, the
 * flat per-household contribution rounded up to ₹10 (COM-01), the tiered contribution by
 * flat size (COM-02), and the funding status: funded, a gap, or a surplus. Boundary: pure
 * arithmetic; the community plan and the verdict read the result.
 */
import {
  CONTRIBUTION_ROUNDING_INR,
  FLAT_SIZE_WEIGHTS,
  FLAT_SIZES,
  type FlatSize,
} from '../domain/community.js';
import type { FundingStatus } from '../schemas/plan-money.js';
import type { NormalisedContext } from './types.js';

export interface FundingTier {
  readonly size: FlatSize;
  readonly weight: number;
  readonly households: number;
  readonly perHouseholdInr: number;
}

export interface Funding {
  readonly status: FundingStatus;
  readonly plannedInr: number;
  readonly sponsorsInr: number;
  readonly rwaFundInr: number;
  readonly ticketsInr: number;
  /** Planned spend minus every offset, never below zero. */
  readonly netInr: number;
  readonly households: number | null;
  readonly perHouseholdInr: number | null;
  readonly tiers: readonly FundingTier[];
  /** What households would pay in all (the rounding makes it slightly more than the net). */
  readonly contributionsInr: number;
  readonly gapInr: number;
  readonly surplusInr: number;
}

/** COM-01: round a per-household amount up to the next ₹10 so collection stays simple. */
function roundUp(amount: number): number {
  return Math.ceil(amount / CONTRIBUTION_ROUNDING_INR) * CONTRIBUTION_ROUNDING_INR;
}

/** COM-02: per-household amounts by flat size, weights 0.75 / 1.0 / 1.25 (grade D). */
function tiersFor(netInr: number, counts: Partial<Record<FlatSize, number>>): FundingTier[] {
  const sizes = FLAT_SIZES.filter((size) => (counts[size] ?? 0) > 0);
  const weighted = sizes.reduce(
    (sum, size) => sum + FLAT_SIZE_WEIGHTS[size] * (counts[size] ?? 0),
    0,
  );
  return sizes.map((size) => ({
    size,
    weight: FLAT_SIZE_WEIGHTS[size],
    households: counts[size] ?? 0,
    perHouseholdInr: roundUp((netInr * FLAT_SIZE_WEIGHTS[size]) / weighted),
  }));
}

/**
 * Works out the funding of a community event; non-community contexts return null.
 * @example
 * computeFunding(ganeshCtx)?.perHouseholdInr; // 1000 (₹2.4 L net over 240 flats)
 */
export function computeFunding(ctx: NormalisedContext): Funding | null {
  if (ctx.family !== 'community') return null;
  // Without the community details nothing offsets the spend yet: the whole budget is a gap.
  const community = ctx.input.community;
  const sponsorsInr = community?.sponsorsInr ?? 0;
  const rwaFundInr = community?.rwaFundInr ?? 0;
  const ticketsInr = community?.ticketsInr ?? 0;
  const offsets = sponsorsInr + rwaFundInr + ticketsInr;
  const netInr = Math.max(0, ctx.budgetInr - offsets);
  const tiers = tiersFor(netInr, community?.flatTiers ?? {});
  const tieredHouseholds = tiers.reduce((sum, tier) => sum + tier.households, 0);
  const households = tiers.length > 0 ? tieredHouseholds : (community?.households ?? null);
  const perHouseholdInr = households === null ? null : roundUp(netInr / households);
  const contributionsInr =
    tiers.length > 0
      ? tiers.reduce((sum, tier) => sum + tier.perHouseholdInr * tier.households, 0)
      : (perHouseholdInr ?? 0) * (households ?? 0);
  const base = { plannedInr: ctx.budgetInr, sponsorsInr, rwaFundInr, ticketsInr, netInr };
  const shared = { ...base, households, perHouseholdInr, tiers, contributionsInr };
  if (offsets >= ctx.budgetInr) {
    return { ...shared, status: 'surplus', gapInr: 0, surplusInr: offsets - ctx.budgetInr };
  }
  if (households === null) return { ...shared, status: 'gap', gapInr: netInr, surplusInr: 0 };
  return { ...shared, status: 'funded', gapInr: 0, surplusInr: contributionsInr - netInr };
}
