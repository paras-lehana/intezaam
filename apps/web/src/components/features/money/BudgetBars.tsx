/**
 * The budget split as horizontal bars — a visual companion to the budget table.
 *
 * Responsibility: show the relative size of each line at a glance, largest first. Bar
 * widths are SVG attributes, never inline styles (strict CSP). Boundary: decorative to
 * assistive technology — the table beside it carries every number, so nothing is lost.
 */
import type { ReactElement } from 'react';
import type { BudgetLine } from '@intezaam/core/schemas';
import { formatShare } from './money-format';

export interface BudgetBarsProps {
  readonly lines: readonly BudgetLine[];
}

/** The SVG viewBox is 100 units wide, so a bar's width is its share of the largest line. */
const BAR_SCALE = 100;
/** Bar thickness in viewBox units (drawn 8 px tall by money.css). */
const BAR_HEIGHT = 8;
const BAR_VIEWBOX = `0 0 ${BAR_SCALE} ${BAR_HEIGHT}`;

export function BudgetBars({ lines }: BudgetBarsProps): ReactElement {
  const sorted = [...lines].sort((a, b) => b.shareBp - a.shareBp);
  const largest = sorted[0]?.shareBp ?? 1;
  return (
    <div className="budget-bars" aria-hidden="true">
      {sorted.map((line) => (
        <div key={line.category} className="budget-bar">
          <span className="budget-bar__name">{line.label}</span>
          <span className="budget-bar__value">{formatShare(line.shareBp)}</span>
          <svg className="budget-bar__track" viewBox={BAR_VIEWBOX} preserveAspectRatio="none">
            <rect
              className="budget-bar__fill"
              width={(line.shareBp / largest) * BAR_SCALE}
              height={BAR_HEIGHT}
              rx={BAR_HEIGHT / 2}
            />
          </svg>
        </div>
      ))}
    </div>
  );
}
