/**
 * Responsibility: the instant in-browser what-if — a change is applied, validated, re-planned
 * and diffed exactly as core's `applyPatch` → `buildPlan` → `diffPlans` do, and a change the
 * server would refuse (out of bounds, past the planning window) comes back as a sentence.
 * Boundary: expectations come from core itself, never from hand-worked numbers.
 */
import { describe, expect, it } from 'vitest';
import { addDaysIso } from '@intezaam/core/domain';
import { applyPatch, diffPlans } from '@intezaam/core/engine';
import {
  type ContextPatch,
  MAX_DAYS_AHEAD,
  MAX_GUESTS,
  eventContextSchema,
} from '@intezaam/core/schemas';
import { previewPlan, simulatePatch } from '../../../components/features/what-if/simulate';
import { TEST_TODAY_ISO } from '../../helpers';
import { planFor, samplePanel } from '../panel-fixtures';

describe('simulatePatch', () => {
  it('re-plans with the change and diffs it against the current plan, as core does', () => {
    const { context, plan } = samplePanel('jaipur-wedding');
    const patch: ContextPatch = { ops: [{ op: 'setGuests', value: context.guests - 50 }] };
    const expectedContext = eventContextSchema.parse(applyPatch(context, patch));
    const expectedPlan = planFor(expectedContext);
    expect(simulatePatch(context, plan, patch, TEST_TODAY_ISO)).toEqual({
      ok: true,
      value: { context: expectedContext, after: expectedPlan, diff: diffPlans(plan, expectedPlan) },
    });
  });

  it('refuses a date past the planning window, naming the window', () => {
    const { context, plan } = samplePanel('jaipur-wedding');
    const tooFar = addDaysIso(TEST_TODAY_ISO, MAX_DAYS_AHEAD + 1);
    if (tooFar === undefined) throw new Error('the test day is a valid date');
    const result = simulatePatch(
      context,
      plan,
      { ops: [{ op: 'setDate', value: tooFar }] },
      TEST_TODAY_ISO,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(String(MAX_DAYS_AHEAD));
  });

  it('refuses a change the context schema rejects', () => {
    const { context, plan } = samplePanel('bengaluru-birthday');
    const result = simulatePatch(
      context,
      plan,
      { ops: [{ op: 'setGuests', value: MAX_GUESTS + 1 }] },
      TEST_TODAY_ISO,
    );
    expect(result.ok).toBe(false);
  });
});

describe('previewPlan', () => {
  it('plans an edited context exactly as the engine does', () => {
    const { context } = samplePanel('jaipur-wedding');
    const edited = { ...context, areaSqft: 3_000 };
    expect(previewPlan(edited, TEST_TODAY_ISO)).toEqual(planFor(edited));
  });

  it('is null for an edit the schema rejects', () => {
    const { context } = samplePanel('jaipur-wedding');
    expect(previewPlan({ ...context, areaSqft: 0 }, TEST_TODAY_ISO)).toBeNull();
  });
});
