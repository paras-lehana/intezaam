/**
 * Responsibility: the Overview tab's figures — the most severe risks first, in words,
 * readiness as a labelled meter and every key number with its own "Why this?". Boundary:
 * plans come from the engine through the shared fixtures; expected words and limits from the
 * components' own tables.
 */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { formatInr } from '@intezaam/core';
import { SEVERITY_STYLES } from '../../../components/features/common/SeverityLabel';
import { KEY_NUMBERS } from '../../../components/features/overview/KeyNumbers';
import { OverviewPanel } from '../../../components/features/overview/OverviewPanel';
import { READINESS_MAX } from '../../../components/features/overview/ReadinessScore';
import { TOP_RISK_COUNT, topRisks } from '../../../components/features/overview/TopRisks';
import { panelProps, samplePlan } from '../plan-fixtures';

function section(name: string): HTMLElement {
  return screen.getByRole('region', { name });
}

describe('risks, readiness and key numbers', () => {
  it('lists the most severe risks first, in words', () => {
    const { plan } = samplePlan('jaipur-wedding');
    render(<OverviewPanel {...panelProps('jaipur-wedding')} />);
    const risks = section('Top risks');
    const shown = topRisks(plan.risks);
    expect(shown.length).toBeLessThanOrEqual(TOP_RISK_COUNT);
    const titles = within(risks)
      .getAllByRole('heading', { level: 4 })
      .map((h) => h.textContent);
    expect(titles).toEqual(shown.map((risk) => risk.title));
    const [first] = shown;
    expect(first?.severity).toBe('blocker');
    expect(within(risks).getAllByText(SEVERITY_STYLES.blocker.label).length).toBeGreaterThan(0);
  });

  it('shows readiness as a labelled meter', () => {
    const { plan } = samplePlan('chennai-60th');
    render(<OverviewPanel {...panelProps('chennai-60th')} />);
    const meter = screen.getByRole('meter', { name: 'Readiness score' });
    expect(meter).toHaveAttribute('value', String(plan.readiness.score));
    expect(meter).toHaveAttribute('max', String(READINESS_MAX));
    expect(screen.getByText(String(plan.readiness.score))).toBeInTheDocument();
  });

  it('lists every key number with its own "Why this?"', () => {
    const props = panelProps('jaipur-wedding');
    render(<OverviewPanel {...props} />);
    const numbers = section('Key numbers');
    for (const entry of KEY_NUMBERS) {
      expect(within(numbers).getByText(entry.label, { selector: 'dt' })).toBeInTheDocument();
    }
    expect(
      within(numbers).getAllByText(formatInr(props.plan.budget.totalInr)).length,
    ).toBeGreaterThan(0);
    expect(within(numbers).getByRole('button', { name: 'Why this? Budget' })).toBeInTheDocument();
  });
});
