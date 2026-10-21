/**
 * The one sentence a screen reader hears about a what-if, once the controls settle.
 *
 * Responsibility: say what is being tried and what it does to the verdict — "What if: Guests:
 * 250. Verdict stays: Balanced budget, Comfortable timeline. 1 new risk." — so the tool
 * announces one summary instead of every table cell on every slider step. Boundary: words
 * only, from the engine's diff and core's verdict labels; the tables show the detail.
 */
import { MONEY_LABELS, TIME_LABELS } from '@intezaam/core/engine';
import type { ContextPatch, PlanDiff } from '@intezaam/core/schemas';
import { describePatch } from './describe-patch';

function riskWords(count: number, kind: 'new' | 'cleared'): string {
  if (count === 0) return '';
  const noun = count === 1 ? 'risk' : 'risks';
  return kind === 'new' ? ` ${count} new ${noun}.` : ` ${count} ${noun} cleared.`;
}

/**
 * The spoken summary of a change and its diff.
 * @example
 * diffSummary({ ops: [{ op: 'setGuests', value: 250 }] }, diff);
 * // 'What if: Guests: 250. Verdict stays: Balanced budget, Comfortable timeline.'
 */
export function diffSummary(patch: ContextPatch, diff: PlanDiff): string {
  const verdict = `${diff.verdictChanged ? 'Verdict changes to' : 'Verdict stays'}: ${
    MONEY_LABELS[diff.money.after]
  } budget, ${TIME_LABELS[diff.time.after]} timeline.`;
  return `What if: ${describePatch(patch).join('; ')}. ${verdict}${riskWords(
    diff.newRisks.length,
    'new',
  )}${riskWords(diff.resolvedRisks.length, 'cleared')}`;
}
