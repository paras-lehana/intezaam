/**
 * Responsibility: the "estimates, not quotes" note — its year span is derived from the plan's
 * own published industry estimates (grade C), never typed in, and it always asks for written
 * quotes; money cells use Indian digit grouping. Boundary: sources come from a real plan and
 * from core's SourceRef shape.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { formatInr } from '@intezaam/core';
import type { SourceRef } from '@intezaam/core/schemas';
import {
  EstimateNote,
  WRITTEN_QUOTES,
  estimateNoteText,
} from '../../../components/features/common/EstimateNote';
import { MoneyCell } from '../../../components/features/common/MoneyCell';
import { samplePlan } from '../plan-fixtures';

const { plan } = samplePlan('jaipur-wedding');

function industryYears(sources: readonly SourceRef[]): readonly number[] {
  return sources.flatMap((source) =>
    source.confidence === 'C' && typeof source.year === 'number' ? [source.year] : [],
  );
}

describe('estimateNoteText', () => {
  it('spans the years of the plan’s published industry estimates', () => {
    const years = industryYears(plan.sources);
    expect(years.length).toBeGreaterThan(0);
    const text = estimateNoteText(plan.sources);
    expect(text).toContain(String(Math.min(...years)));
    expect(text).toContain(String(Math.max(...years)));
    expect(text).toContain(`get ${WRITTEN_QUOTES} written quotes`);
  });

  it('shows one year when every estimate comes from the same year', () => {
    const [first] = plan.sources.filter((source) => industryYears([source]).length > 0);
    expect(first).toBeDefined();
    const sources = first === undefined ? [] : [first, { ...first, id: `${first.id}-copy` }];
    expect(estimateNoteText(sources)).toBe(
      `Estimates from published ${String(first?.year)} sources — get ${WRITTEN_QUOTES} written quotes before you book.`,
    );
  });

  it('still asks for written quotes when there are no dated estimates', () => {
    expect(estimateNoteText([])).toBe(
      `Estimates, not quotes — get ${WRITTEN_QUOTES} written quotes before you book.`,
    );
  });

  it('renders the note', () => {
    render(<EstimateNote sources={plan.sources} />);
    expect(screen.getByText(estimateNoteText(plan.sources))).toBeInTheDocument();
  });
});

describe('MoneyCell', () => {
  it('shows the amount with lakh grouping', () => {
    render(<MoneyCell amount={plan.budget.totalInr} />);
    expect(screen.getByText(formatInr(plan.budget.totalInr))).toBeInTheDocument();
    expect(formatInr(2_500_000)).toBe('₹25,00,000');
  });
});
