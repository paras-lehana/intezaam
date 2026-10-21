/**
 * Tests for engine/levers.ts — buildLevers, the top costed changes.
 *
 * Responsibility: prove levers appear exactly when a money signal is short (a band below the
 * typical range, a funding gap or a short food line) and never otherwise; at most three,
 * the biggest saving first; each traced with its rule and the money verdict; and that the
 * reported new status is what the same engine says after the lever's own patch.
 * Boundary: expectations come from the engine re-run on the patched context.
 */
import { describe, expect, it } from 'vitest';
import { LEVER_IDS, LEVERS, LEVERS_SHOWN } from '../domain/levers.js';
import { buildLevers } from '../engine/levers.js';
import { createTraceLog } from '../engine/trace.js';
import { applyPatch } from '../engine/what-if.js';
import { leverSchema } from '../schemas/plan-money.js';
import type { EventContext } from '../schemas/context.js';
import {
  birthday,
  clean,
  community,
  coreOf,
  planOf,
  sample,
  TODAY,
  wedding,
} from './fixtures/engine-contexts.js';

function leversOf(context: EventContext): ReturnType<typeof buildLevers> {
  return buildLevers(clean(context), coreOf(context), TODAY, createTraceLog());
}

describe('buildLevers', () => {
  it('offers nothing when no money signal is short', () => {
    for (const context of [birthday(), community(), wedding({ budgetInr: 200_000_000 })]) {
      const core = coreOf(context);
      expect(core.costCheck.status).toBe('covered');
      expect(leversOf(context)).toEqual([]);
    }
  });

  it('offers levers for a short food line even when the band reads Balanced', () => {
    const core = coreOf(wedding());
    expect([core.money.status, core.costCheck.status]).toEqual(['balanced', 'short']);
    expect(leversOf(wedding()).length).toBeGreaterThan(0);
  });

  it('offers levers for home-style, lean and a funding gap', () => {
    expect(leversOf(wedding({ city: 'Delhi', budgetInr: 1_000_000 })).length).toBeGreaterThan(0);
    expect(leversOf(sample('chennai-60th')).length).toBeGreaterThan(0);
    const gap = leversOf(community({ community: { premises: 'public', days: 1 } }));
    expect(gap.map((lever) => lever.id)).toContain('find-sponsors');
  });

  it('keeps at most three, biggest saving first, ties in lever order', () => {
    const levers = leversOf(wedding());
    expect(levers.length).toBeLessThanOrEqual(LEVERS_SHOWN);
    levers.slice(1).forEach((lever, index) => {
      const previous = levers[index];
      if (previous === undefined) return;
      expect(previous.savingInr).toBeGreaterThanOrEqual(lever.savingInr);
      if (previous.savingInr === lever.savingInr) {
        expect(LEVER_IDS.indexOf(previous.id)).toBeLessThan(LEVER_IDS.indexOf(lever.id));
      }
    });
  });

  it('traces each lever under its rule and cites the money verdict', () => {
    const core = coreOf(wedding());
    const trace = createTraceLog();
    const levers = buildLevers(clean(wedding()), core, TODAY, trace);
    for (const lever of levers) {
      expect(leverSchema.safeParse(lever).success).toBe(true);
      expect(lever.ruleId).toBe(LEVERS[lever.id].ruleId);
      const item = trace.items().find((entry) => entry.id === lever.traceIds[0]);
      expect(item?.ruleId).toBe(LEVERS[lever.id].ruleId);
      expect(lever.traceIds).toEqual(expect.arrayContaining([...core.money.traceIds]));
    }
  });

  it('reports the status the engine gives after a guest-cut lever’s own patch', () => {
    const lever = leversOf(wedding()).find((entry) => entry.id === 'fewer-guests');
    expect(lever?.patch).toBeDefined();
    if (lever?.patch === undefined) return;
    const after = planOf(applyPatch(clean(wedding()), lever.patch));
    expect(lever.newMoneyStatus).toBe(after.verdict.money.status);
  });
});
