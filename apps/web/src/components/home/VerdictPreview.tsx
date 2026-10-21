/**
 * The hero object: one ruled page of the family ledger, stamped.
 *
 * Responsibility: show what a plan page looks like using real data only — the Jaipur
 * wedding sample's inputs and the published starting split for weddings (BUDGET_SPLITS,
 * grade C) — with the page's one motion moment: the bars fill once and the stamp lands.
 * Boundary: no verdict is invented here; the card says the real verdict comes from the
 * user's own details. Bar lengths are SVG attributes, not inline styles (strict CSP).
 */
import type { ReactElement } from 'react';
import { formatLakh } from '@intezaam/core';
import {
  BUDGET_CATEGORIES,
  BUDGET_SPLITS,
  CATEGORY_PROFILES,
  SAMPLE_CONTEXTS,
} from '@intezaam/core/domain';
import type { BudgetCategory } from '@intezaam/core/domain';

/** Five lines fit the card at a 390 px phone width and still show the split's biggest shares. */
const PREVIEW_LINES = 5;
/** Basis points per percent (10,000 bp = 100%). */
const BP_PER_PERCENT = 100;
/** The bars' SVG viewBox is 100 units wide, so a bar's width is its share of the largest line. */
const BAR_SCALE = 100;
/** Bar thickness in viewBox units (rendered 6 px tall by ledger-card.css); ends fully rounded. */
const BAR_HEIGHT = 6;
const BAR_RADIUS = BAR_HEIGHT / 2;
const BAR_VIEWBOX = `0 0 ${BAR_SCALE} ${BAR_HEIGHT}`;

interface PreviewLine {
  readonly category: BudgetCategory;
  readonly bp: number;
}

/**
 * The largest starting shares of a wedding budget, biggest first.
 * @example
 * topWeddingLines(1)[0]?.category; // 'catering'
 */
export function topWeddingLines(count: number): readonly PreviewLine[] {
  const shares = BUDGET_SPLITS.wedding.shares;
  // Walking the closed category tuple keeps the key typed (Object.entries would widen it).
  return BUDGET_CATEGORIES.flatMap((category) => {
    const bp = shares[category];
    return bp === undefined ? [] : [{ category, bp }];
  })
    .sort((a, b) => b.bp - a.bp)
    .slice(0, count);
}

export function VerdictPreview(): ReactElement {
  const sample = SAMPLE_CONTEXTS['jaipur-wedding'];
  const lines = topWeddingLines(PREVIEW_LINES);
  const largest = lines[0]?.bp ?? 1;
  const budget = sample.context.budgetInr;
  return (
    <figure className="ledger-card ledger" aria-labelledby="ledger-card-caption">
      <p className="ledger-card__kicker">A page from a plan · example</p>
      <p className="ledger-card__title">{sample.label}</p>
      <p className="ledger-card__meta">
        {sample.context.guests} guests ·{' '}
        {budget === undefined ? 'budget to estimate' : formatLakh(budget)} · {sample.context.city}
      </p>
      <p className="ledger-card__label">Starting split for weddings</p>
      <ul className="plain-list ledger-card__bars" role="list">
        {lines.map((line) => (
          <li key={line.category} className="ledger-bar">
            <span className="ledger-bar__name">{CATEGORY_PROFILES[line.category].label}</span>
            <span className="ledger-bar__value">{line.bp / BP_PER_PERCENT}%</span>
            <svg
              className="ledger-bar__track"
              viewBox={BAR_VIEWBOX}
              preserveAspectRatio="none"
              aria-hidden="true"
              focusable="false"
            >
              <rect
                className="ledger-bar__fill"
                width={(line.bp / largest) * BAR_SCALE}
                height={BAR_HEIGHT}
                rx={BAR_RADIUS}
              />
            </svg>
          </li>
        ))}
      </ul>
      <dl className="ledger-card__axes">
        <div>
          <dt>Money</dt>
          <dd>Can the budget cover it?</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>Is there time to book?</dd>
        </div>
      </dl>
      <p className="stamp" aria-hidden="true">
        <span className="stamp__main">Code-checked</span>
        <span className="stamp__sub">every number has a reason</span>
      </p>
      <figcaption id="ledger-card-caption" className="ledger-card__caption">
        Example page: the {sample.label} sample and the published starting split. Your verdict comes
        from your own details.
      </figcaption>
    </figure>
  );
}
