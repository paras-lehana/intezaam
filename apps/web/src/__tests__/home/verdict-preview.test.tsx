/**
 * Responsibility: the hero's ledger page — bars show the largest starting shares from the core
 * split table, the sample's inputs appear as stored, and the stamp is decoration hidden from
 * assistive technology. Boundary: expected shares are recomputed from BUDGET_SPLITS, never
 * typed by hand.
 */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  BUDGET_CATEGORIES,
  BUDGET_SPLITS,
  CATEGORY_PROFILES,
  SAMPLE_CONTEXTS,
} from '@intezaam/core/domain';
import { topWeddingLines, VerdictPreview } from '../../components/home/VerdictPreview';

const PREVIEW_COUNT = 5;

describe('topWeddingLines', () => {
  it('returns the largest shares of the wedding split, biggest first', () => {
    const shares = BUDGET_SPLITS.wedding.shares;
    const expected = BUDGET_CATEGORIES.flatMap((category) => {
      const bp = shares[category];
      return bp === undefined ? [] : [bp];
    })
      .sort((a, b) => b - a)
      .slice(0, PREVIEW_COUNT);
    expect(topWeddingLines(PREVIEW_COUNT).map((line) => line.bp)).toEqual(expected);
  });
});

describe('VerdictPreview', () => {
  it('shows the sample and one bar per line, labelled in words', () => {
    render(<VerdictPreview />);
    const sample = SAMPLE_CONTEXTS['jaipur-wedding'];
    const figure = screen.getByRole('figure');
    expect(within(figure).getByText(sample.label)).toBeInTheDocument();
    expect(figure).toHaveTextContent(`${sample.context.guests} guests`);
    const lines = topWeddingLines(PREVIEW_COUNT);
    const items = within(figure).getAllByRole('listitem');
    expect(items).toHaveLength(lines.length);
    lines.forEach((line, index) => {
      expect(items[index]).toHaveTextContent(CATEGORY_PROFILES[line.category].label);
    });
  });

  it('keeps the stamp out of the accessibility tree', () => {
    const { container } = render(<VerdictPreview />);
    expect(container.querySelector('.stamp')).toHaveAttribute('aria-hidden', 'true');
  });
});
