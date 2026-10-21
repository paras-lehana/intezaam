/**
 * Logo mark: a gold sparkle over a tick resting on a ledger line, on an espresso tile.
 *
 * Responsibility: the brand symbol in the header and footer (public/favicon.svg draws the
 * same shapes with literal colours). The idea: an entry in the family ledger, checked off,
 * with the celebration's sparkle above it. Boundary: decorative (aria-hidden); the
 * wordmark beside it carries the name. Colours come from classes, never inline styles.
 */
import type { ReactElement } from 'react';

export function BrandMark(): ReactElement {
  return (
    <svg className="brand__mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect className="brand__tile" x="0.75" y="0.75" width="30.5" height="30.5" rx="8" />
      <path className="brand__ledger" d="M6 25h20" />
      <path className="brand__tick" d="M8.5 17.5l4.5 4.5 6.5-8" />
      <path
        className="brand__sparkle"
        d="M23.5 4l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3z"
      />
    </svg>
  );
}
