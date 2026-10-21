/**
 * A titled section inside a workspace panel (an h3 under the panel's h2).
 *
 * Responsibility: the card, heading and optional lede every panel section shares, labelled
 * by its heading so the section is a navigable region. Boundary: layout only.
 */
import type { ReactElement, ReactNode } from 'react';

export interface PanelSectionProps {
  /** Unique on the page; the heading gets `${id}-heading`. */
  readonly id: string;
  readonly title: string;
  readonly lede?: ReactNode;
  readonly children: ReactNode;
}

export function PanelSection({ id, title, lede, children }: PanelSectionProps): ReactElement {
  const headingId = `${id}-heading`;
  return (
    <section id={id} className="card panel-section" aria-labelledby={headingId}>
      <h3 id={headingId} className="panel-section__title">
        {title}
      </h3>
      {lede === undefined ? null : <p className="panel-section__lede">{lede}</p>}
      {children}
    </section>
  );
}
