/**
 * The documentation every decision rule carries.
 *
 * Responsibility: the shape of one rule's entry (title, one-sentence summary, grade and
 * cited sources) and the helper the grouped rule tables use to build entries.
 * Boundary: shape only; the entries are in the `rules-*.ts` tables.
 */
import type { SourceId } from './sources.js';
import type { Confidence } from './source-types.js';

export interface RuleInfo {
  readonly title: string;
  /** One plain sentence: what the rule decides and from which inputs. */
  readonly summary: string;
  /** Grade of the rule's logic; derived or assumed logic is D even when its inputs are sourced. */
  readonly confidence: Confidence;
  readonly sourceIds: readonly SourceId[];
}

/**
 * Builds one rule entry.
 * @example
 * ruleInfo('Scale band', 'Under 100 guests is intimate…', 'D', ['S-VK-2026']).confidence; // 'D'
 */
export function ruleInfo(
  title: string,
  summary: string,
  confidence: Confidence,
  sourceIds: readonly SourceId[],
): RuleInfo {
  return { title, summary, confidence, sourceIds };
}
