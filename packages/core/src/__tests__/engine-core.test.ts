/**
 * Tests for engine/core.ts — buildCore, the money core every lever re-runs.
 *
 * Responsibility: prove the core runs the same rules buildPlan shows (its budget, headcount,
 * verdict and cost check equal the plan's), prices food at the verdict's caterer class,
 * passes the verdict into the cost check, and works out funding only for community events.
 * Boundary: expectations come from buildPlan on the same context.
 */
import { describe, expect, it } from 'vitest';
import { cateringRange } from '../engine/catering.js';
import { buildCore } from '../engine/core.js';
import { createTraceLog } from '../engine/trace.js';
import { community, coreOf, planOf, sample, TODAY, wedding } from './fixtures/engine-contexts.js';

describe('buildCore', () => {
  it('matches the plan built from the same context', () => {
    const core = coreOf(wedding());
    const plan = planOf(wedding());
    expect(core.budget).toEqual(plan.budget);
    expect(core.headcount).toEqual(plan.headcount);
    expect(core.costCheck).toEqual(plan.costCheck);
    expect(core.money.status).toBe(plan.verdict.money.status);
  });

  it('prices food at the caterer class the verdict chose', () => {
    for (const context of [wedding(), sample('chennai-60th'), wedding({ budgetInr: 900_000 })]) {
      const core = coreOf(context);
      expect(core.costCheck.cateringInr).toEqual(cateringRange(core.ctx, core.money.level));
    }
  });

  it('checks the food against ₹0 when the catering line is switched off', () => {
    const core = coreOf(wedding({ disabledCategories: ['catering'] }));
    expect(core.budget.lines.some((line) => line.category === 'catering')).toBe(false);
    expect([core.costCheck.cateringLineInr, core.costCheck.status]).toEqual([0, 'short']);
  });

  it('works out funding only for community events', () => {
    expect(coreOf(wedding()).funding).toBeNull();
    const ganesh = coreOf(community());
    expect(ganesh.funding?.verdict.status).toBe(ganesh.funding?.funding.status);
  });

  it('writes its trace into the log it is given', () => {
    const trace = createTraceLog();
    buildCore(wedding(), TODAY, trace);
    const rules = new Set(trace.items().map((item) => item.ruleId));
    for (const rule of ['HC-01', 'VER-M', 'CST-01'] as const) expect(rules.has(rule)).toBe(true);
  });
});
