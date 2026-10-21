/**
 * Tests for engine/plan.ts — buildPlan, the deterministic planner.
 *
 * Responsibility: run every sample persona through buildPlan and prove the plan-wide
 * invariants (schema-valid, budget lines sum to the total, every referenced trace id exists,
 * every cited source is listed, both verdict axes present, funding only for community
 * events, deterministic), then the boundary inputs: one guest, no budget, a past date, an
 * open date, community events with and without households or sponsors, and invalid input
 * returned as an error value; the 60th's cards, priest lead and elders plan; a utsav's own
 * festival. Boundary: expectations come from the plan itself.
 */
import { describe, expect, it } from 'vitest';
import { daysBetweenIso } from '../domain/calendar.js';
import { SAMPLE_IDS } from '../domain/samples.js';
import { monthsToDays } from '../domain/timeline.js';
import { buildPlan, checkPlan } from '../engine/plan.js';
import type { EventContext } from '../schemas/context.js';
import { MONEY_STATUSES, TIME_STATUSES } from '../schemas/plan-money.js';
import { type Plan, planSchema } from '../schemas/plan.js';
import {
  community,
  inDays,
  planOf,
  sample,
  TODAY,
  undated,
  wedding,
  withoutBudget,
} from './fixtures/engine-contexts.js';

/** Every array stored under `key` anywhere in the plan (trace ids, source ids). */
function collect(value: unknown, key: string, found: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach((item) => collect(item, key, found));
  } else if (typeof value === 'object' && value !== null) {
    for (const [name, child] of Object.entries(value)) {
      if (name === key && Array.isArray(child)) {
        found.push(...child.filter((id): id is string => typeof id === 'string'));
      } else {
        collect(child, key, found);
      }
    }
  }
  return found;
}

function expectInvariants(plan: Plan): void {
  expect(planSchema.safeParse(plan).success).toBe(true);
  const lines = plan.budget.lines.reduce((sum, line) => sum + line.amountInr, 0);
  expect(lines).toBe(plan.budget.totalInr);
  const traceIds = new Set(plan.trace.map((item) => item.id));
  const { trace: _items, ...sections } = plan;
  for (const id of collect(sections, 'traceIds')) expect(traceIds.has(id)).toBe(true);
  const sourceIds = new Set(plan.sources.map((source) => source.id));
  for (const id of collect(plan, 'sourceIds')) expect(sourceIds.has(id)).toBe(true);
  expect(MONEY_STATUSES).toContain(plan.verdict.money.status);
  expect(TIME_STATUSES).toContain(plan.verdict.time.status);
  expect(plan.verdict.money.traceIds.length).toBeGreaterThan(0);
  expect(plan.verdict.time.traceIds.length).toBeGreaterThan(0);
  expect(plan.verdict.funding !== undefined).toBe(plan.contextEcho.family === 'community');
}

describe('buildPlan on every sample persona', () => {
  it.each(SAMPLE_IDS)('%s: keeps every plan invariant', (id) => {
    const plan = planOf(sample(id));
    expectInvariants(plan);
    expect(plan.todayIso).toBe(TODAY);
    expect(plan.title.length).toBeGreaterThan(0);
  });

  it('is deterministic: the same input gives the same plan', () => {
    expect(planOf(sample('jaipur-wedding'))).toEqual(planOf(sample('jaipur-wedding')));
  });

  it('keeps the money signals consistent: food is never "short" for a committee', () => {
    const ganesh = planOf(sample('society-ganesh'));
    expect(ganesh.costCheck.status).toBe('covered');
    expect(ganesh.verdict.funding?.status).toBe('funded');
    expect(ganesh.verdict.estimateInr.high).toBe(ganesh.budget.totalInr);
  });

  it('offers levers whenever a money signal is short, and none otherwise', () => {
    for (const id of SAMPLE_IDS) {
      const plan = planOf(sample(id));
      const short =
        plan.costCheck.status === 'short' ||
        ['stretch', 'home-style', 'lean'].includes(plan.verdict.money.status);
      expect(plan.levers.length > 0).toBe(short);
    }
  });

  it('plans the 60th: two function cards, the priest 2–3 months out, an elders plan', () => {
    const sixtieth = sample('chennai-60th');
    const plan = planOf(sixtieth);
    expect(plan.functions.map((fn) => fn.functionKind)).toEqual(sixtieth.functions);
    // The 60th lead time: "2–3 months (D); fix the date with a priest".
    const priest = plan.vendors.find((vendor) => vendor.vendorType === 'pandit');
    const lead = daysBetweenIso(priest?.bookByIso ?? TODAY, sixtieth.dateIso ?? TODAY) ?? 0;
    expect(lead).toBeGreaterThanOrEqual(monthsToDays(2));
    expect(lead).toBeLessThanOrEqual(monthsToDays(3));
    expect(plan.accessibility.items.map((item) => item.id)).toContain('elder-seating');
    expect(plan.timeline.tasks.some((task) => task.id === 's-elders-plan')).toBe(true);
  });

  it('never calls a utsav on its own festival a clash', () => {
    const notes = planOf(sample('society-ganesh')).timeline.dateNotes;
    const festival = notes.filter((note) => note.kind === 'festival-clash');
    expect(festival.length).toBeGreaterThan(0);
    expect(festival.every((note) => note.text.startsWith('Your celebration falls on'))).toBe(true);
    const rain = notes.filter((note) => note.kind === 'rain-risk');
    expect(rain.length).toBeGreaterThan(0);
    expect(rain.every((note) => note.sourceIds.includes('S-IMD-2020'))).toBe(true);
  });
});

describe('buildPlan boundary inputs', () => {
  const variants: [string, EventContext][] = [
    ['one guest', wedding({ guests: 1 })],
    ['no budget (estimate mode)', withoutBudget(wedding())],
    ['a past date', wedding({ dateIso: inDays(-3) })],
    ['an open date', undated(wedding())],
    ['the event today', wedding({ dateIso: TODAY })],
    ['community without households', community({ community: { premises: 'public', days: 1 } })],
    [
      'community with sponsors covering it all',
      community({ community: { premises: 'private', days: 2, sponsorsInr: 400_000 } }),
    ],
  ];

  it.each(variants)('%s: still builds a valid plan', (_label, context) => {
    expectInvariants(planOf(context));
  });

  it('says so when the budget is our estimate', () => {
    const plan = planOf(withoutBudget(wedding()));
    expect(plan.budget.source).toBe('estimate');
    expect(plan.budget.totalInr).toBe(plan.verdict.estimateInr.mid);
    expect(plan.risks.some((risk) => risk.id === 'risk-estimated-budget')).toBe(true);
  });

  it('reads past and open dates in their own timeline modes', () => {
    expect(planOf(wedding({ dateIso: inDays(-3) })).timeline.mode).toBe('past');
    expect(planOf(undated(wedding())).timeline.mode).toBe('undated');
  });

  it('reads a community funding gap and a surplus', () => {
    const gap = planOf(community({ community: { premises: 'public', days: 1 } }));
    expect(gap.verdict.funding?.status).toBe('gap');
    const surplus = planOf(
      community({ community: { premises: 'private', days: 2, sponsorsInr: 400_000 } }),
    );
    expect(surplus.verdict.funding?.status).toBe('surplus');
  });

  it('falls back to "<kind> in <city>" when no title is given', () => {
    const { title: _none, ...untitled } = wedding();
    expect(planOf(untitled).title).toContain('Jaipur');
  });
});

describe('buildPlan errors are values', () => {
  it('rejects an impossible today', () => {
    const result = buildPlan(wedding(), '2026-02-30');
    expect(result.ok ? null : result.error.code).toBe('VALIDATION_FAILED');
  });

  it('rejects a context that breaks the schema, naming the field', () => {
    const result = buildPlan(wedding({ guests: 0 }), TODAY);
    expect(result.ok ? null : result.error.code).toBe('VALIDATION_FAILED');
    expect(result.ok ? '' : (result.error.internalHint ?? '')).toContain('guests');
  });

  it('reports a plan that breaks the wire contract as an internal error', () => {
    const result = checkPlan({ title: '' });
    expect(result.ok ? null : result.error.code).toBe('INTERNAL');
    expect(result.ok ? '' : (result.error.internalHint ?? '')).toContain('plan contract');
    expect(checkPlan(planOf(wedding())).ok).toBe(true);
  });
});
