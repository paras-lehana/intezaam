/**
 * A wide table's scroll box: on a phone the table scrolls inside its card, not the page.
 *
 * Responsibility: wrap a table in a named, keyboard-focusable region so a keyboard user can
 * scroll it with the arrow keys (WCAG 2.1.1; axe "scrollable-region-focusable") and a screen
 * reader announces what it holds. Boundary: layout only; the table and its caption come from
 * the caller.
 */
import type { ReactElement, ReactNode } from 'react';

/** In the tab order, so a box that scrolls can be scrolled without a mouse (also the share preview). */
export const SCROLL_REGION_TAB_INDEX = 0;

export interface TableScrollProps {
  /** Names the region; usually the table's caption. */
  readonly label: string;
  readonly children: ReactNode;
  /** Extra layout class, such as the run sheet's spacing. */
  readonly className?: string | undefined;
}

export function TableScroll({ label, children, className }: TableScrollProps): ReactElement {
  return (
    <div
      className={className === undefined ? 'table-scroll' : `table-scroll ${className}`}
      role="region"
      aria-label={label}
      tabIndex={SCROLL_REGION_TAB_INDEX}
    >
      {children}
    </div>
  );
}
