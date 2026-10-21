/**
 * Tests for engine/community.ts — contributions, the ledger seed and volunteers (COM-01…05).
 *
 * Responsibility: prove the volunteer roster (one crowd marshal per 100 people, a named lead
 * per role, roles switched on by the plan), the flat and tiered contribution with its trace
 * rule, a ledger seeded with every non-zero collection and every budget head, and the 80G
 * check for charity events. Boundary: funding numbers come from funding.ts.
 */
import { describe, expect, it } from 'vitest';
import {
  ATTENDEES_PER_MARSHAL,
  CONTRIBUTION_ROUNDING_INR,
  VOLUNTEER_ROLE_INFO,
} from '../domain/community.js';
import { buildBudget } from '../engine/budget.js';
import { computeShares } from '../engine/budget-shares.js';
import { buildCommunityPlan, volunteerCounts } from '../engine/community.js';
import { computeFunding } from '../engine/funding.js';
import { createTraceLog } from '../engine/trace.js';
import type { NormalisedContext } from '../engine/types.js';
import { communityPlanSchema } from '../schemas/plan-people.js';
import type { EventContext } from '../schemas/context.js';
import type { PlanBudget } from '../schemas/plan-money.js';
import { community, normalised } from './fixtures/engine-contexts.js';

function setup(context: EventContext): { ctx: NormalisedContext; budget: PlanBudget } {
  const ctx = normalised(context);
  return { ctx, budget: buildBudget(ctx, computeShares(ctx), createTraceLog()).budget };
}

function planFor(context: EventContext): {
  plan: ReturnType<typeof buildCommunityPlan>;
  ruleIds: string[];
} {
  const { ctx, budget } = setup(context);
  const funding = computeFunding(ctx);
  if (funding === null) throw new Error('community funding expected');
  const trace = createTraceLog();
  const plan = buildCommunityPlan(ctx, funding, budget, trace);
  return { plan, ruleIds: trace.items().map((item) => item.ruleId) };
}

describe('volunteerCounts (COM-04)', () => {
  it('puts one crowd marshal per 100 people and one lead on every other role', () => {
    const { ctx, budget } = setup(community());
    const counts = volunteerCounts(ctx, budget);
    expect(counts['crowd-marshal']).toBe(Math.ceil(ctx.footfall / ATTENDEES_PER_MARSHAL));
    for (const [role, count] of Object.entries(counts)) {
      if (role === 'crowd-marshal') continue;
      const perVolunteer = Object.entries(VOLUNTEER_ROLE_INFO).find(([key]) => key === role)?.[1]
        .attendeesPerVolunteer;
      expect(count).toBe(
        perVolunteer === null ? 1 : Math.ceil(ctx.footfall / ATTENDEES_PER_MARSHAL),
      );
    }
  });

  it('switches roles on from the plan: programme, sound and access needs', () => {
    const quiet = setup(
      community({
        functions: ['puja', 'bhog'],
        sound: { amplified: false, endHhmm: '21:00', nearSilenceZone: false, crackers: false },
        accessibility: { elderly: false, wheelchair: false, kids: true },
      }),
    );
    const counts = volunteerCounts(quiet.ctx, quiet.budget);
    expect(counts['games-cultural']).toBeUndefined();
    expect(counts['sound-power']).toBeUndefined();
    expect(counts.accessibility).toBeUndefined();
    const full = setup(community());
    const all = volunteerCounts(full.ctx, full.budget);
    expect([all['games-cultural'], all['sound-power'], all.accessibility]).toEqual([1, 1, 1]);
  });
});

describe('buildCommunityPlan', () => {
  it('builds a schema-valid flat contribution traced by COM-01', () => {
    const { plan, ruleIds } = planFor(community());
    expect(communityPlanSchema.safeParse(plan).success).toBe(true);
    expect(plan.contribution.mode).toBe('flat');
    expect(plan.contribution.roundingInr).toBe(CONTRIBUTION_ROUNDING_INR);
    expect(ruleIds).toEqual(['COM-01', 'COM-03', 'COM-04']);
  });

  it('switches to the tiered contribution (COM-02) when flat sizes are given', () => {
    const tiered = community({
      community: {
        premises: 'private',
        days: 5,
        flatTiers: { small: 40, medium: 120, large: 80 },
      },
    });
    const { plan, ruleIds } = planFor(tiered);
    expect(plan.contribution.mode).toBe('tiered');
    expect(plan.contribution.tiers.length).toBe(3);
    expect(ruleIds[0]).toBe('COM-02');
  });

  it('seeds the ledger with every collection above zero and every budget head', () => {
    const { ctx, budget } = setup(community());
    const { plan } = planFor(community());
    const collected = plan.ledgerSeed.filter((entry) => entry.kind === 'collected');
    expect(collected.every((entry) => entry.amountInr > 0)).toBe(true);
    expect(collected.map((entry) => entry.id)).not.toContain('collect-tickets');
    const spent = plan.ledgerSeed.filter((entry) => entry.kind === 'spent');
    expect(spent).toHaveLength(budget.lines.length);
    expect(plan.footfall).toBe(ctx.footfall);
  });

  it('asks for households when none are given, and checks 80G for a charity', () => {
    const { plan } = planFor(community({ community: { premises: 'public', days: 1 } }));
    expect(plan.contribution.perHouseholdInr).toBeUndefined();
    const charity = planFor(community({ kind: 'charity-fundraiser' }));
    expect(charity.ruleIds).toContain('COM-05');
  });
});
