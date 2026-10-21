/**
 * Method and sources: every published source the planner relies on, grouped by grade.
 *
 * Responsibility: render core's source register (listSources) under the four confidence
 * grades — law or official guidance, survey, industry estimate, our assumption — with a
 * link, publisher and year for each; the section takes focus when a link names it
 * (`/about#sources`, layout/RouteFocus). Boundary: data comes from core, so a new source
 * appears here without touching the page; grade D is always called an assumption.
 */
import type { ReactElement } from 'react';
import { CONFIDENCE_GRADES, CONFIDENCE_LABELS, listSources } from '@intezaam/core/domain';
import type { Confidence } from '@intezaam/core/domain';

// Efficiency: the register is static data, so it is grouped once when the page module loads,
// not on every render.
const SOURCES_BY_GRADE: ReadonlyMap<Confidence, ReturnType<typeof listSources>> = new Map(
  CONFIDENCE_GRADES.map((grade) => [
    grade,
    listSources().filter((source) => source.confidence === grade),
  ]),
);

export function SourcesRegister(): ReactElement {
  return (
    <section id="sources" className="card" aria-labelledby="sources-heading" tabIndex={-1}>
      <h2 id="sources-heading">Method and sources</h2>
      <p>
        Every number in a plan carries a confidence grade. Grade A is law or official guidance;
        grade D is an assumption we made, labelled “Assumption” in the plan so you can change it.
        Amounts are estimates, never quotes.
      </p>
      {CONFIDENCE_GRADES.map((grade) => {
        const sources = SOURCES_BY_GRADE.get(grade) ?? [];
        return (
          <details key={grade} className="sources-grade">
            <summary className="sources-grade__summary">
              <span className="sources-grade__badge">Grade {grade}</span>
              <span>{CONFIDENCE_LABELS[grade]}</span>
              <span className="sources-grade__count">
                {sources.length} {sources.length === 1 ? 'source' : 'sources'}
              </span>
            </summary>
            <ul className="plain-list sources-grade__list" role="list">
              {sources.map((source) => (
                <li key={source.id} className="source">
                  <a href={source.url} rel="noopener noreferrer" target="_blank">
                    {source.title}
                    <span className="visually-hidden"> (opens in a new tab)</span>
                  </a>
                  <span className="source__meta">
                    {source.publisher}, {source.year}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </section>
  );
}
