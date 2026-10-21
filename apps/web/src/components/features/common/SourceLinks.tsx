/**
 * Links to the published sources behind a rule or a note: publisher, year and grade.
 *
 * Responsibility: one consistent way to cite — "Publisher, year" as the link text (so the
 * year is visible, not hidden in a tooltip), the title after it, and a warning that the
 * link opens a new tab. Boundary: renders the sources it is given; ids are resolved by
 * trace-lookup.ts.
 */
import type { ReactElement } from 'react';
import type { SourceRef } from '@intezaam/core/schemas';

export interface SourceLinksProps {
  readonly sources: readonly SourceRef[];
}

export function SourceLinks({ sources }: SourceLinksProps): ReactElement | null {
  if (sources.length === 0) return null;
  return (
    <ul className="plain-list source-links" role="list">
      {sources.map((source) => (
        <li key={source.id}>
          <a href={source.url} target="_blank" rel="noopener noreferrer">
            {source.publisher}, {source.year}{' '}
            <span className="visually-hidden">(opens in a new tab)</span>
          </a>{' '}
          <span className="source-links__title">— {source.title}</span>
        </li>
      ))}
    </ul>
  );
}
