/**
 * Responsibility: the Overview tab's verdict and summary — the verdict axes with their
 * reasons (funding only for community events), the likely spend range, and the narration in
 * each state with its provenance and three next steps. Boundary: plans and narration come
 * from the engine and the shared fixtures; expected words from the components' own tables.
 * Risks, readiness and key numbers live in overview-figures.test.tsx.
 */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { formatInr } from '@intezaam/core';
import { FUNDING_LABELS, MONEY_LABELS, TIME_LABELS, buildPlan } from '@intezaam/core/engine';
import type { Plan } from '@intezaam/core/schemas';
import { ASKING_GEMINI, provenanceText } from '../../../components/features/common/ProvenanceBadge';
import { NARRATION_PLACEHOLDER } from '../../../components/features/overview/NarrativeSection';
import { nextActions } from '../../../components/features/overview/next-actions';
import { OverviewPanel } from '../../../components/features/overview/OverviewPanel';
import { verdictAxes } from '../../../components/features/overview/VerdictCard';
import { TEST_TODAY_ISO } from '../../helpers';
import { GEMINI_PROVENANCE, narrationFor, panelProps, samplePlan } from '../plan-fixtures';

/** Budget steps tried below the sample's own budget, as a share of it (100% down to 5%). */
const BUDGET_STEP_PERCENT = 5;
const PERCENT = 100;

/**
 * The Jaipur wedding at the highest budget the engine itself calls Simple & home-style:
 * the band is found by asking the engine, never by typing a rupee figure here.
 */
function homeStylePlan(): Plan | undefined {
  const { context } = samplePlan('jaipur-wedding');
  const budget = context.budgetInr ?? 0;
  for (let pct = PERCENT; pct > 0; pct -= BUDGET_STEP_PERCENT) {
    const built = buildPlan(
      { ...context, budgetInr: Math.round((budget * pct) / PERCENT) },
      TEST_TODAY_ISO,
    );
    if (built.ok && built.value.verdict.money.status === 'home-style') return built.value;
  }
  return undefined;
}

function section(name: string): HTMLElement {
  return screen.getByRole('region', { name });
}

describe('verdict', () => {
  it('shows money and time with their reasons and the likely spend', () => {
    const props = panelProps('jaipur-wedding');
    const { verdict } = props.plan;
    render(<OverviewPanel {...props} />);
    const card = section(verdict.headline);
    expect(
      within(card).getByText(MONEY_LABELS[verdict.money.status], { selector: 'strong' }),
    ).toBeInTheDocument();
    expect(
      within(card).getByText(TIME_LABELS[verdict.time.status], { selector: 'strong' }),
    ).toBeInTheDocument();
    expect(within(card).getByText(verdict.money.reason, { exact: false })).toBeInTheDocument();
    expect(within(card).getByText(formatInr(verdict.estimateInr.low))).toBeInTheDocument();
    expect(
      within(card).getByRole('button', { name: 'Why this? Money verdict' }),
    ).toBeInTheDocument();
    expect(verdictAxes(props.plan).map((axis) => axis.key)).toEqual(['money', 'time']);
  });

  it('reads a home-style wedding as "Simple & home-style", never "not feasible"', () => {
    const plan = homeStylePlan();
    expect(plan).toBeDefined();
    if (plan === undefined) return;
    render(<OverviewPanel {...panelProps('jaipur-wedding')} plan={plan} />);
    const card = section(plan.verdict.headline);
    const label = MONEY_LABELS['home-style'];
    expect(within(card).getByText(label, { selector: 'strong' })).toBeInTheDocument();
    expect(card.querySelector('.stamp__main')).toHaveTextContent(label);
    expect(within(card).getByText(plan.verdict.money.reason, { exact: false })).toBeInTheDocument();
    expect(card).not.toHaveTextContent(/not feasible/i);
  });

  it('adds the funding axis for a community event', () => {
    const { plan } = samplePlan('society-ganesh');
    const funding = plan.verdict.funding;
    expect(funding).toBeDefined();
    render(<OverviewPanel {...panelProps('society-ganesh')} />);
    expect(verdictAxes(plan).map((axis) => axis.key)).toEqual(['money', 'time', 'funding']);
    const status = funding === undefined ? '' : FUNDING_LABELS[funding.status];
    expect(screen.getByText(status, { selector: 'strong' })).toBeInTheDocument();
  });
});

describe('narration', () => {
  it('waits politely while Gemini writes', () => {
    render(<OverviewPanel {...panelProps('bengaluru-birthday', { narrationState: 'loading' })} />);
    const summary = section('Summary and next steps');
    expect(within(summary).getByText(NARRATION_PLACEHOLDER.loading)).toBeInTheDocument();
    expect(within(summary).getByText(ASKING_GEMINI)).toBeInTheDocument();
    expect(summary.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('shows the narration, its provenance and the model’s next steps', () => {
    const { plan } = samplePlan('jaipur-wedding');
    const narration = narrationFor(plan);
    render(
      <OverviewPanel
        {...panelProps('jaipur-wedding', { narration, narrationState: 'ready' })}
        provenance={GEMINI_PROVENANCE}
      />,
    );
    const summary = section('Summary and next steps');
    expect(within(summary).getByText(narration.headline)).toBeInTheDocument();
    expect(within(summary).getByText(narration.summary)).toBeInTheDocument();
    expect(
      within(summary).getByText(provenanceText('ready', GEMINI_PROVENANCE)),
    ).toBeInTheDocument();
    const steps = within(summary)
      .getAllByRole('listitem')
      .filter((item) => item.closest('ol'));
    expect(steps).toHaveLength(nextActions(plan, narration).length);
    expect(within(summary).getByRole('button', { name: 'Why this? reason 1' })).toBeInTheDocument();
  });

  it('falls back to the plan’s own three next steps when offline', () => {
    const { plan } = samplePlan('bengaluru-birthday');
    render(<OverviewPanel {...panelProps('bengaluru-birthday', { narrationState: 'offline' })} />);
    const summary = section('Summary and next steps');
    expect(within(summary).getByText(NARRATION_PLACEHOLDER.offline)).toBeInTheDocument();
    for (const action of nextActions(plan)) {
      expect(within(summary).getByText(action.text, { exact: false })).toBeInTheDocument();
    }
  });
});
