/**
 * Title block for inner pages: eyebrow, the page's one h1, a lede and a gold hairline.
 *
 * Responsibility: consistent page openings for About and Not found (and the plan page). The
 * h1 is focusable from script (tabIndex -1, never a Tab stop), so a page change can land the
 * reader on it (layout/RouteFocus). Boundary: presentation only; the home page has its own
 * espresso hero.
 */
import type { ReactElement, ReactNode } from 'react';
import { Hairline } from './Hairline';

export interface PageHeroProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly children: ReactNode;
  /** Lets a page find its heading to move focus to it after an action. */
  readonly headingId?: string;
}

export function PageHero({ eyebrow, title, children, headingId }: PageHeroProps): ReactElement {
  return (
    <div className="page-hero">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="page-hero__title" id={headingId} tabIndex={-1}>
        {title}
      </h1>
      <p className="lede">{children}</p>
      <Hairline />
    </div>
  );
}
