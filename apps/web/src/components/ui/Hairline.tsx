/**
 * Gold hairline with diamond (✦) ends — the ledger's only ornament besides the sparkle.
 *
 * Responsibility: one decorative divider used between sections. Boundary: decorative, so
 * hidden from assistive technology; the ✦ glyphs come from CSS (primitives.css).
 */
import type { ReactElement } from 'react';

export function Hairline(): ReactElement {
  return (
    <div className="hairline" aria-hidden="true">
      <span className="hairline__line" />
    </div>
  );
}
