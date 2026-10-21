/**
 * Tests for engine/safety.ts — crowd checks (CROWD-01…05) and the access plan (ACC-01…06).
 *
 * Responsibility: prove each NDMA crowd check appears exactly when its trigger fires (always,
 * above a footfall threshold — tested at and just above it — or for a pandal or food
 * stalls), and that the access plan lists the domain items for the ticked needs with one
 * trace item per rule. Boundary: expectations come from the domain tables.
 */
import { describe, expect, it } from 'vitest';
import { accessItemsFor } from '../domain/accessibility.js';
import { CROWD_CHECK_IDS, CROWD_CHECKS } from '../domain/crowd.js';
import { buildAccessibility, buildCrowd } from '../engine/safety.js';
import { createTraceLog } from '../engine/trace.js';
import { accessibilityPlanSchema, crowdPlanSchema } from '../schemas/plan-safety.js';
import type { EventContext } from '../schemas/context.js';
import { classified, community, homePuja, wedding } from './fixtures/engine-contexts.js';

const crowd = (context: EventContext): ReturnType<typeof buildCrowd> =>
  buildCrowd(classified(context), 'CTX-06.1', createTraceLog());
const ids = (context: EventContext): string[] => crowd(context).checks.map((check) => check.id);

/** An indoor home puja with a given footfall: only the footfall triggers can fire. */
const indoorWith = (footfall: number): EventContext =>
  homePuja({ guests: footfall, venueSetting: 'home' });

describe('buildCrowd', () => {
  it('runs the always-on checks for every event and cites the class trace first', () => {
    const plan = crowd(indoorWith(10));
    expect(crowdPlanSchema.safeParse(plan).success).toBe(true);
    const always = CROWD_CHECK_IDS.filter((id) => CROWD_CHECKS[id].trigger.kind === 'always');
    expect(plan.checks.map((check) => check.id)).toEqual(always);
    expect(plan.traceIds[0]).toBe('CTX-06.1');
  });

  it('adds each footfall check just above its threshold, not at it', () => {
    for (const id of CROWD_CHECK_IDS) {
      const trigger = CROWD_CHECKS[id].trigger;
      if (trigger.kind !== 'above') continue;
      expect(ids(indoorWith(trigger.footfall))).not.toContain(id);
      expect(ids(indoorWith(trigger.footfall + 1))).toContain(id);
    }
  });

  it('adds the structure checks for open-air or community events and the stall checks for a mela', () => {
    const structure = CROWD_CHECK_IDS.filter((id) => {
      const trigger = CROWD_CHECKS[id].trigger;
      return trigger.kind === 'feature' && trigger.feature === 'structure';
    });
    const stalls = CROWD_CHECK_IDS.filter((id) => {
      const trigger = CROWD_CHECKS[id].trigger;
      return trigger.kind === 'feature' && trigger.feature === 'stalls';
    });
    expect(ids(community())).toEqual(expect.arrayContaining(structure));
    expect(ids(indoorWith(10))).not.toContain(structure[0]);
    expect(ids(community({ functions: ['puja', 'mela'] }))).toEqual(expect.arrayContaining(stalls));
    expect(ids(community())).not.toContain(stalls[0]);
  });
});

describe('buildAccessibility', () => {
  it('lists the domain items for the ticked needs', () => {
    const ctx = classified(wedding());
    const plan = buildAccessibility(ctx, createTraceLog());
    expect(accessibilityPlanSchema.safeParse(plan).success).toBe(true);
    expect(plan.needs).toEqual([...ctx.accessNeeds]);
    expect(plan.items.map((item) => item.id)).toEqual(accessItemsFor(ctx.accessNeeds));
    expect(plan.traceIds).toHaveLength(new Set(plan.items.map((item) => item.ruleId)).size);
  });

  it('still lists the always-on items when no need is ticked', () => {
    const none = classified(
      wedding({ accessibility: { elderly: false, wheelchair: false, kids: false } }),
    );
    const plan = buildAccessibility(none, createTraceLog());
    expect(plan.needs).toEqual([]);
    expect(plan.items.map((item) => item.id)).toEqual(accessItemsFor([]));
  });
});
