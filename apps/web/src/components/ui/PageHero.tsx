/**
 * Title block for inner pages: eyebrow, the page's one h1, a lede and a gold hairline.
 *
 * Responsibility: consistent page openings for About and Not found (and the plan page).
 * Boundary: presentation only; the home page has its own espresso hero.
 */
import type { ReactElement, ReactNode } from 'react';
import { Hairline } from './Hairline';

export interface PageHeroProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly children: ReactNode;
  /** Lets a page move focus to its heading after an action (tabIndex -1 when set). */
  readonly headingId?: string;
}

export function PageHero({ eyebrow, title, children, headingId }: PageHeroProps): ReactElement {
  return (
    <div className="page-hero">
      <p className="eyebrow">{eyebrow}</p>
      <h1
        className="page-hero__title"
        id={headingId}
        tabIndex={headingId === undefined ? undefined : -1}
      >
        {title}
      </h1>
      <p className="lede">{children}</p>
      <Hairline />
    </div>
  );
}
