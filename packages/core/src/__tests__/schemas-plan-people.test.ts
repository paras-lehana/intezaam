/**
 * Tests for schemas/plan-people.ts: vendor, headcount, food, space and community contracts.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { FLAT_SIZE_WEIGHTS, VOLUNTEER_ROLE_INFO } from '../domain/community.js';
import {
  communityPlanSchema,
  foodPlanSchema,
  headcountSchema,
  spaceCheckSchema,
  vendorChecklistSchema,
} from '../schemas/plan-people.js';
import { buildFixturePlan } from './fixtures/plan-fixture.js';

const plan = buildFixturePlan();

describe('people and vendor contracts', () => {
  it('accept the fixture sections', () => {
    expect(headcountSchema.safeParse(plan.headcount).success).toBe(true);
    expect(foodPlanSchema.safeParse(plan.food).success).toBe(true);
    expect(spaceCheckSchema.safeParse(plan.space).success).toBe(true);
    for (const vendor of plan.vendors)
      expect(vendorChecklistSchema.safeParse(vendor).success).toBe(true);
  });

  it('rejects a vendor without a maps link and an attendance rate above 1', () => {
    const [vendor] = plan.vendors;
    expect(vendorChecklistSchema.safeParse({ ...vendor, mapsUrl: 'nowhere' }).success).toBe(false);
    expect(headcountSchema.safeParse({ ...plan.headcount, attendanceRate: 1.2 }).success).toBe(
      false,
    );
  });

  it('accepts a community plan with a tiered contribution and a roster', () => {
    const marshal = VOLUNTEER_ROLE_INFO['crowd-marshal'];
    const community = {
      footfall: 1200,
      contribution: {
        mode: 'tiered',
        plannedInr: 350_000,
        sponsorsInr: 60_000,
        rwaFundInr: 50_000,
        ticketsInr: 0,
        netInr: 240_000,
        households: 240,
        tiers: [
          {
            size: 'medium',
            weight: FLAT_SIZE_WEIGHTS.medium,
            households: 240,
            perHouseholdInr: 1000,
          },
        ],
        roundingInr: 10,
      },
      ledgerSeed: [{ id: 'l1', label: 'Sponsors', kind: 'collected', amountInr: 60_000 }],
      volunteers: [{ role: 'crowd-marshal', label: marshal.label, duty: marshal.duty, count: 12 }],
      sponsorIdeas: [],
      traceIds: [],
    };
    expect(communityPlanSchema.safeParse(community).success).toBe(true);
    const badMode = { ...community.contribution, mode: 'whatever' };
    expect(communityPlanSchema.safeParse({ ...community, contribution: badMode }).success).toBe(
      false,
    );
  });
});
