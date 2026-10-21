/**
 * Community toolkit (COM-01…05) — contributions, a starting ledger and the volunteer roster.
 *
 * Responsibility: present the funding maths (flat or tiered per-household contribution),
 * seed a ledger with every expected collection and every budget head, size the volunteer
 * roster (one crowd marshal per 100 people plus a named lead per role), and flag the 80G
 * check for charity events. Boundary: the funding numbers come from funding.ts.
 */
import {
  ATTENDEES_PER_MARSHAL,
  CONTRIBUTION_ROUNDING_INR,
  SPONSOR_IDEAS,
  VOLUNTEER_ROLE_INFO,
  VOLUNTEER_ROLES,
  type VolunteerRole,
} from '../domain/community.js';
import { formatInr } from '../format.js';
import type { PlanBudget } from '../schemas/plan-money.js';
import type { CommunityPlan } from '../schemas/plan-people.js';
import type { Funding } from './funding.js';
import type { TraceLog } from './trace.js';
import type { ClassifiedContext } from './types.js';

/** Functions with a stage programme need a games and cultural team. */
const PROGRAMME_FUNCTIONS = ['cultural-night', 'mela', 'fundraiser'] as const;

type Ledger = CommunityPlan['ledgerSeed'];

function ledgerSeed(funding: Funding, budget: PlanBudget): Ledger {
  const collected: [string, string, number][] = [
    ['collect-sponsors', 'Sponsors', funding.sponsorsInr],
    ['collect-rwa-fund', 'RWA fund', funding.rwaFundInr],
    ['collect-tickets', 'Tickets', funding.ticketsInr],
    ['collect-households', 'Household contributions', funding.contributionsInr],
  ];
  return [
    ...collected
      .filter(([, , amount]) => amount > 0)
      .map(([id, label, amountInr]) => ({ id, label, kind: 'collected' as const, amountInr })),
    ...budget.lines.map((line) => ({
      id: `spend-${line.category}`,
      label: line.label,
      kind: 'spent' as const,
      amountInr: line.amountInr,
      category: line.category,
    })),
  ];
}

/**
 * COM-04: how many volunteers each role needs (marshals by footfall, a named lead otherwise).
 * @example
 * volunteerCounts(ganeshCtx, budget)['crowd-marshal']; // 12 for 1,200 people
 */
export function volunteerCounts(
  ctx: ClassifiedContext,
  budget: PlanBudget,
): Partial<Record<VolunteerRole, number>> {
  const has = (category: string): boolean =>
    budget.lines.some((line) => line.category === category);
  const on: Record<VolunteerRole, boolean> = {
    'committee-lead': true,
    treasurer: true,
    'decor-team': has('decor'),
    'food-team': has('catering'),
    'games-cultural': PROGRAMME_FUNCTIONS.some((kind) => ctx.functions.includes(kind)),
    'crowd-marshal': true,
    'first-aid': true,
    'help-desk': true,
    'sound-power': ctx.amplifiedSound,
    accessibility: ctx.accessNeeds.some((need) => need !== 'kids'),
  };
  return Object.fromEntries(
    VOLUNTEER_ROLES.filter((role) => on[role]).map((role) => [
      role,
      VOLUNTEER_ROLE_INFO[role].attendeesPerVolunteer === null
        ? 1
        : Math.ceil(ctx.footfall / ATTENDEES_PER_MARSHAL),
    ]),
  );
}

function contributionEffect(funding: Funding, tiered: boolean): string {
  if (funding.perHouseholdInr === null) {
    return 'Add the number of households to work out each one’s share.';
  }
  const split = tiered ? 'by flat size' : `${formatInr(funding.perHouseholdInr)} each`;
  return `${formatInr(funding.netInr)} over ${funding.households ?? 0} households: ${split}, rounded up to the next ${formatInr(CONTRIBUTION_ROUNDING_INR)}.`;
}

/**
 * Builds the community plan for a community event.
 * @example
 * buildCommunityPlan(ganeshCtx, funding, budget, trace).contribution.perHouseholdInr; // 1000
 */
export function buildCommunityPlan(
  ctx: ClassifiedContext,
  funding: Funding,
  budget: PlanBudget,
  trace: TraceLog,
): CommunityPlan {
  const tiered = funding.tiers.length > 0;
  const counts = volunteerCounts(ctx, budget);
  const volunteers = VOLUNTEER_ROLES.flatMap((role) => {
    const count = counts[role];
    if (count === undefined) return [];
    const info = VOLUNTEER_ROLE_INFO[role];
    return [{ role, label: info.label, duty: info.duty, count }];
  });
  const roster = volunteers.reduce((sum, entry) => sum + entry.count, 0);
  const contributionId = trace.add({
    ruleId: tiered ? 'COM-02' : 'COM-01',
    inputs: [
      ['net to collect', formatInr(funding.netInr)],
      ['households', funding.households ?? 'not given'],
      ['rounded to', formatInr(CONTRIBUTION_ROUNDING_INR)],
    ],
    effect: contributionEffect(funding, tiered),
  });
  const traceIds = [
    contributionId,
    trace.rule('COM-03'),
    trace.add({
      ruleId: 'COM-04',
      inputs: [
        ['footfall', ctx.footfall],
        ['volunteers offered', ctx.input.community?.volunteers ?? 'not given'],
      ],
      effect: `${roster} volunteers across ${volunteers.length} roles, with one crowd marshal per ${ATTENDEES_PER_MARSHAL} people.`,
    }),
  ];
  if (ctx.kind === 'charity-fundraiser') traceIds.push(trace.rule('COM-05'));
  return {
    footfall: ctx.footfall,
    contribution: {
      mode: tiered ? 'tiered' : 'flat',
      plannedInr: funding.plannedInr,
      sponsorsInr: funding.sponsorsInr,
      rwaFundInr: funding.rwaFundInr,
      ticketsInr: funding.ticketsInr,
      netInr: funding.netInr,
      ...(funding.households === null ? {} : { households: funding.households }),
      ...(funding.perHouseholdInr === null ? {} : { perHouseholdInr: funding.perHouseholdInr }),
      tiers: funding.tiers.map((tier) => ({ ...tier })),
      roundingInr: CONTRIBUTION_ROUNDING_INR,
    },
    ledgerSeed: ledgerSeed(funding, budget),
    volunteers,
    sponsorIdeas: [...SPONSOR_IDEAS],
    traceIds,
  };
}
