/**
 * Responsibility: the one sentence the What-if tool speaks — it names the change, says
 * whether the verdict stays or changes with core's labels, and counts new and cleared risks
 * only when there are some. Boundary: diffs come from `simulatePatch` on the sample plans;
 * the labels from core's verdict tables.
 */
import { describe, expect, it } from 'vitest';
import { MONEY_LABELS, TIME_LABELS } from '@intezaam/core/engine';
import type { ContextPatch } from '@intezaam/core/schemas';
import { describePatch } from '../../../components/features/what-if/describe-patch';
import { diffSummary } from '../../../components/features/what-if/diff-summary';
import { simulatePatch } from '../../../components/features/what-if/simulate';
import { TEST_TODAY_ISO } from '../../helpers';
import { samplePanel } from '../panel-fixtures';

function summaryFor(id: Parameters<typeof samplePanel>[0], patch: ContextPatch): string {
  const setup = samplePanel(id);
  const outcome = simulatePatch(setup.context, setup.plan, patch, TEST_TODAY_ISO);
  if (!outcome.ok) throw new Error(outcome.error);
  const { diff } = outcome.value;
  const verdict = diff.verdictChanged ? 'Verdict changes to' : 'Verdict stays';
  expect(diffSummary(patch, diff)).toContain(
    `${verdict}: ${MONEY_LABELS[diff.money.after]} budget, ${TIME_LABELS[diff.time.after]} timeline.`,
  );
  return diffSummary(patch, diff);
}

describe('diffSummary', () => {
  it('names the change and the verdict after it', () => {
    const patch: ContextPatch = { ops: [{ op: 'setVenueSetting', value: 'indoor' }] };
    const spoken = summaryFor('bengaluru-birthday', patch);
    expect(spoken.startsWith(`What if: ${describePatch(patch).join('; ')}.`)).toBe(true);
  });

  it('counts new and cleared risks only when there are some', () => {
    const setup = samplePanel('bengaluru-birthday');
    const patch: ContextPatch = { ops: [{ op: 'setVenueSetting', value: 'indoor' }] };
    const outcome = simulatePatch(setup.context, setup.plan, patch, TEST_TODAY_ISO);
    if (!outcome.ok) throw new Error(outcome.error);
    const { diff } = outcome.value;
    const cleared = diff.resolvedRisks.length;
    expect(cleared).toBeGreaterThan(0);
    expect(diffSummary(patch, diff)).toContain(` ${cleared} risk`);
    expect(diffSummary(patch, diff)).toMatch(/cleared\.$/);
    const quiet = diffSummary(patch, { ...diff, newRisks: [], resolvedRisks: [] });
    expect(quiet).not.toMatch(/risk/);
    expect(quiet.endsWith('timeline.')).toBe(true);
  });
});
