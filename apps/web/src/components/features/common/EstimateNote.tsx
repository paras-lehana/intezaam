/**
 * The standing note under every money figure: these are estimates, get written quotes.
 *
 * Responsibility: say where the estimates come from — the publication years of the plan's
 * own published industry estimates (grade C sources), derived, never typed in — and ask
 * for three written quotes before booking. Boundary: wording only; the sources come from
 * the plan.
 */
import type { ReactElement } from 'react';
import type { SourceRef } from '@intezaam/core/schemas';

/** Comparing three written quotes is the standing advice of the planning guides. */
export const WRITTEN_QUOTES = 3;

export interface EstimateNoteProps {
  readonly sources: readonly SourceRef[];
}

/**
 * The note text, with the year span of the plan's grade-C (industry estimate) sources.
 * @example
 * estimateNoteText([]); // 'Estimates, not quotes — get 3 written quotes before you book.'
 */
export function estimateNoteText(sources: readonly SourceRef[]): string {
  const years = sources.flatMap((source) =>
    source.confidence === 'C' && typeof source.year === 'number' ? [source.year] : [],
  );
  const advice = `get ${WRITTEN_QUOTES} written quotes before you book.`;
  if (years.length === 0) return `Estimates, not quotes — ${advice}`;
  const from = Math.min(...years);
  const to = Math.max(...years);
  const span = from === to ? String(from) : `${from}–${to}`;
  return `Estimates from published ${span} sources — ${advice}`;
}

export function EstimateNote({ sources }: EstimateNoteProps): ReactElement {
  return (
    <p className="estimate-note">
      <span aria-hidden="true">✦</span> {estimateNoteText(sources)}
    </p>
  );
}
