/**
 * Tests for engine/funding.ts — community funding (VER-F, COM-01, COM-02).
 *
 * Responsibility: prove offsets, the net to collect, the flat per-household share rounded up
 * to ₹10, the tiered share by flat size, and the funded / gap / surplus statuses, including
 * an event with no community details. Boundary: expectations come from the domain weights.
 */
import { describe, expect, it } from 'vitest';
import { CONTRIBUTION_ROUNDING_INR, FLAT_SIZE_WEIGHTS } from '../domain/community.js';
import { computeFunding } from '../engine/funding.js';
import type { EventContext } from '../schemas/context.js';
import { community, normalised, wedding } from './fixtures/engine-contexts.js';

const extras = community().community ?? { premises: 'private' as const, days: 1 };

function fundingOf(context: EventContext): ReturnType<typeof computeFunding> {
  return computeFunding(normalised(context));
}

describe('computeFunding', () => {
  it('is null for events that are not community events', () => {
    expect(fundingOf(wedding())).toBeNull();
  });

  it('splits the net flat across households, rounded up to ₹10', () => {
    const funding = fundingOf(community());
    const offsets = (extras.sponsorsInr ?? 0) + (extras.rwaFundInr ?? 0) + (extras.ticketsInr ?? 0);
    const net = (community().budgetInr ?? 0) - offsets;
    const households = extras.households ?? 1;
    const each =
      Math.ceil(net / households / CONTRIBUTION_ROUNDING_INR) * CONTRIBUTION_ROUNDING_INR;
    expect(funding).toMatchObject({
      status: 'funded',
      netInr: net,
      perHouseholdInr: each,
      gapInr: 0,
    });
    expect(funding?.surplusInr).toBe(each * households - net);
  });

  it('weights a tiered contribution by flat size', () => {
    const flatTiers = { small: 100, medium: 100, large: 40 };
    const funding = fundingOf(community({ community: { ...extras, flatTiers } }));
    const small = funding?.tiers.find((tier) => tier.size === 'small');
    const large = funding?.tiers.find((tier) => tier.size === 'large');
    expect(funding?.households).toBe(240);
    expect(small?.weight).toBe(FLAT_SIZE_WEIGHTS.small);
    expect(large?.perHouseholdInr ?? 0).toBeGreaterThan(small?.perHouseholdInr ?? 0);
    expect(funding?.contributionsInr ?? 0).toBeGreaterThanOrEqual(funding?.netInr ?? 0);
  });

  it('reports a surplus when offsets cover the whole budget', () => {
    const funding = fundingOf(community({ community: { ...extras, sponsorsInr: 500_000 } }));
    const offsets = 500_000 + (extras.rwaFundInr ?? 0);
    expect(funding).toMatchObject({
      status: 'surplus',
      netInr: 0,
      surplusInr: offsets - (community().budgetInr ?? 0),
    });
  });

  it('reports the whole net as a gap without households, or without any details', () => {
    const { households: _none, ...noHouseholds } = extras;
    const gap = fundingOf(community({ community: noHouseholds }));
    expect([gap?.status, gap?.gapInr, gap?.perHouseholdInr]).toEqual(['gap', gap?.netInr, null]);
    const { community: _details, ...bare } = community();
    const nothing = fundingOf(bare);
    expect([nothing?.status, nothing?.gapInr]).toEqual(['gap', bare.budgetInr]);
  });
});
