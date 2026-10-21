/**
 * Tests for engine/diff.ts — diffPlans, what changed between two plans.
 *
 * Responsibility: prove an unchanged plan diffs to nothing, and that a real change reports
 * the verdict axes, the total and every moved category (deltas = after − before), risks that
 * appeared or cleared, tasks added, removed, re-statused or re-dated, vendors added or
 * removed, the funding axis for community events and the cheapest fix the new plan offers.
 * Boundary: both plans come from buildPlan; expectations are read from those plans.
 */
import { describe, expect, it } from 'vitest';
import { diffPlans } from '../engine/diff.js';
import { applyPatch } from '../engine/what-if.js';
import { planDiffSchema } from '../schemas/diff.js';
import type { Plan } from '../schemas/plan.js';
import { community, inDays, planOf, wedding } from './fixtures/engine-contexts.js';

const base = planOf(wedding());

describe('diffPlans', () => {
  it('finds nothing between a plan and itself', () => {
    const diff = diffPlans(base, base);
    expect(planDiffSchema.safeParse(diff).success).toBe(true);
    expect(diff.verdictChanged).toBe(false);
    expect([diff.totalDeltaInr, diff.budgetChanges, diff.taskChanges]).toEqual([0, [], []]);
    expect([diff.newRisks, diff.resolvedRisks, diff.vendorChanges]).toEqual([[], [], []]);
    expect(diff.funding).toBeUndefined();
  });

  it('reports the total and every category that moved, with after − before deltas', () => {
    const richer = planOf(wedding({ budgetInr: 4_000_000 }));
    const diff = diffPlans(base, richer);
    expect(diff.totalDeltaInr).toBe(richer.budget.totalInr - base.budget.totalInr);
    expect(diff.budgetChanges.length).toBeGreaterThan(0);
    for (const change of diff.budgetChanges) {
      expect(change.deltaInr).toBe(change.afterInr - change.beforeInr);
    }
  });

  it('reports verdict, risk and task changes when the date moves close', () => {
    const rushed = planOf(wedding({ dateIso: inDays(20) }));
    const diff = diffPlans(base, rushed);
    expect(diff.verdictChanged).toBe(base.verdict.time.status !== rushed.verdict.time.status);
    expect(diff.time).toEqual({
      before: base.verdict.time.status,
      after: rushed.verdict.time.status,
    });
    const afterRisks = new Set(rushed.risks.map((risk) => risk.id));
    for (const risk of diff.resolvedRisks) expect(afterRisks.has(risk.id)).toBe(false);
    expect(diff.taskChanges.some((task) => task.change === 'due' || task.change === 'status')).toBe(
      true,
    );
  });

  it('reports tasks and vendors added or removed with a function', () => {
    const noSangeet = planOf(
      applyPatch(wedding(), { ops: [{ op: 'removeFunction', value: 'sangeet' }] }),
    );
    const removed = diffPlans(base, noSangeet);
    const added = diffPlans(noSangeet, base);
    const changeKinds = (diff: typeof removed): string[] =>
      diff.taskChanges.map((task) => task.change);
    const vendorsGone = base.vendors.length - noSangeet.vendors.length;
    expect(removed.vendorChanges.filter((v) => v.change === 'removed').length).toBe(
      Math.max(vendorsGone, 0),
    );
    expect(added.vendorChanges.every((v) => v.change === 'added')).toBe(true);
    if (base.timeline.tasks.length !== noSangeet.timeline.tasks.length) {
      expect(changeKinds(removed)).toContain('removed');
      expect(changeKinds(added)).toContain('added');
    }
  });

  it('carries the funding axis for community events, before and after', () => {
    const funded = planOf(community());
    const gap = planOf(community({ community: { premises: 'public', days: 1 } }));
    const diff = diffPlans(funded, gap);
    expect(diff.funding).toEqual({
      before: funded.verdict.funding?.status,
      after: gap.verdict.funding?.status,
    });
    expect(diffPlans(base, funded).funding).toEqual({ after: funded.verdict.funding?.status });
  });

  it('names the lever that saves the most in the new plan as the cheapest fix', () => {
    const withLevers: Plan =
      base.levers.length > 0 ? base : planOf(wedding({ budgetInr: 900_000 }));
    const best = [...withLevers.levers].sort((a, b) => b.savingInr - a.savingInr)[0];
    expect(diffPlans(base, withLevers).cheapestFix).toEqual({
      leverId: best?.id,
      title: best?.title,
      savingInr: best?.savingInr,
    });
    const noLevers = planOf(wedding({ budgetInr: 200_000_000 }));
    expect(noLevers.levers).toEqual([]);
    expect(diffPlans(base, noLevers).cheapestFix).toBeUndefined();
  });
});
