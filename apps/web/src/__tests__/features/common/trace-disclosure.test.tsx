/**
 * Responsibility: "Why this?" — a real disclosure button named after its subject that reveals
 * the rule id and title, the inputs used, the effect, the confidence grade in words, the
 * "Assumption" badge for grade-D or assumed values, and source links with publisher and year;
 * nothing renders when no trace id resolves. Boundary: trace items and sources come from a
 * plan the engine built; nothing is typed by hand.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CONFIDENCE_LABELS } from '@intezaam/core/domain';
import type { Plan, TraceItem } from '@intezaam/core/schemas';
import { ASSUMPTION_BADGE } from '../../../components/features/common/ConfidenceLabel';
import { TraceDisclosure, WHY_THIS } from '../../../components/features/common/TraceDisclosure';
import { sourcesFor, traceItemsFor } from '../../../components/features/common/trace-lookup';
import { samplePlan } from '../plan-fixtures';

const { plan } = samplePlan('jaipur-wedding');

function firstItem(predicate: (item: TraceItem) => boolean): TraceItem {
  const item = plan.trace.find(predicate);
  if (item === undefined) throw new Error('the sample plan has no such trace item');
  return item;
}

/** A sourced rule that is not an assumption, and one the engine flags as an assumption. */
const SOURCED = firstItem((item) => !item.assumption && item.sourceIds.length > 0);
const ASSUMED = firstItem((item) => item.assumption);

function renderTrace(traceIds: readonly string[], target: Plan = plan): void {
  render(<TraceDisclosure plan={target} traceIds={traceIds} subject="Venue" />);
}

describe('TraceDisclosure', () => {
  it('is a collapsed button named after what it explains', () => {
    renderTrace([SOURCED.id]);
    const button = screen.getByRole('button', { name: `${WHY_THIS} Venue` });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(SOURCED.effect)).not.toBeInTheDocument();
  });

  it('reveals the rule, inputs, effect, grade and sources', async () => {
    const user = userEvent.setup();
    renderTrace([SOURCED.id]);
    const button = screen.getByRole('button', { name: `${WHY_THIS} Venue` });
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(button.getAttribute('aria-controls') ?? '');
    expect(panel).not.toBeNull();
    const scope = within(panel ?? document.body);
    expect(scope.getByText(SOURCED.ruleId)).toBeInTheDocument();
    expect(scope.getByText(SOURCED.effect)).toBeInTheDocument();
    expect(scope.getByText(new RegExp(CONFIDENCE_LABELS[SOURCED.confidence]))).toBeInTheDocument();
    expect(scope.queryByText(ASSUMPTION_BADGE)).not.toBeInTheDocument();
    for (const input of SOURCED.inputs) {
      expect(scope.getAllByText(input.key).length).toBeGreaterThan(0);
    }
    for (const source of sourcesFor(plan, SOURCED.sourceIds)) {
      const link = scope.getByRole('link', {
        name: new RegExp(`${source.publisher}, ${source.year}`),
      });
      expect(link).toHaveAttribute('href', source.url);
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('labels an assumed value as an assumption', async () => {
    const user = userEvent.setup();
    renderTrace([ASSUMED.id]);
    await user.click(screen.getByRole('button', { name: `${WHY_THIS} Venue` }));
    expect(screen.getByText(ASSUMPTION_BADGE)).toBeInTheDocument();
  });

  it('collapses again on a second press', async () => {
    const user = userEvent.setup();
    renderTrace([SOURCED.id]);
    const button = screen.getByRole('button', { name: `${WHY_THIS} Venue` });
    await user.click(button);
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(SOURCED.effect)).not.toBeInTheDocument();
  });

  it('renders nothing when no trace id resolves', () => {
    renderTrace(['no-such-trace']);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('trace lookup', () => {
  it('keeps the cited order and drops duplicates and unknown ids', () => {
    const ids = [ASSUMED.id, SOURCED.id, ASSUMED.id, 'unknown'];
    expect(traceItemsFor(plan, ids)).toEqual([ASSUMED, SOURCED]);
  });

  it('resolves source ids to the plan’s own sources', () => {
    const [first] = plan.sources;
    expect(first).toBeDefined();
    expect(sourcesFor(plan, [first?.id ?? '', 'unknown'])).toEqual([first]);
  });
});
