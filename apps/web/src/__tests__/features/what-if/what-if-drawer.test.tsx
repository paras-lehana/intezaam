/**
 * Responsibility: the What-if tool — moving a control re-plans in the browser and shows the
 * engine's diff, "Apply this change" sends exactly the typed patch, Reset and a new plan
 * start again from "no change", and "Explain this change" asks the planner only when pressed
 * (the vendor-cancellation check is in vendor-cancel-note.test.tsx). Boundary: expected
 * numbers come from `simulatePatch` on the same sample plan; only the server reply is stubbed.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { formatInr } from '@intezaam/core';
import { FUNCTION_PROFILES } from '@intezaam/core/domain';
import type { ContextPatch } from '@intezaam/core/schemas';
import { provenanceText } from '../../../components/features/common/ProvenanceBadge';
import { SEVERITY_STYLES } from '../../../components/features/common/SeverityLabel';
import { explainQuestion } from '../../../components/features/what-if/describe-patch';
import { simulatePatch } from '../../../components/features/what-if/simulate';
import { shiftedBudget } from '../../../components/features/what-if/what-if-scenario';
import { WhatIfDrawer } from '../../../components/features/what-if/WhatIfDrawer';
import { TEST_TODAY_ISO, jsonResponse, stubFetch } from '../../helpers';
import { OFFLINE_PROVENANCE, askReply, samplePanel } from '../panel-fixtures';

/** The guest move this test owns (a multiple of the slider's step of five). */
const FEWER = 50;
/** A budget move this test owns (a multiple of the slider's 5% step). */
const BUDGET_STEP_DOWN = -10;

function fewerGuestsPatch(guests: number): ContextPatch {
  return { ops: [{ op: 'setGuests', value: guests - FEWER }] };
}

describe('WhatIfDrawer', () => {
  it('asks for a move before comparing anything', () => {
    render(<WhatIfDrawer {...samplePanel('jaipur-wedding').props} />);
    expect(screen.getByRole('heading', { name: 'What if…' })).toBeInTheDocument();
    expect(screen.getByText('Move any control above to compare.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply this change' })).not.toBeInTheDocument();
  });

  it('shows the engine’s diff for fewer guests and applies exactly that change', async () => {
    const user = userEvent.setup();
    const setup = samplePanel('jaipur-wedding');
    render(<WhatIfDrawer {...setup.props} />);
    fireEvent.change(screen.getByLabelText('Guests'), {
      target: { value: String(setup.context.guests - FEWER) },
    });
    const patch = fewerGuestsPatch(setup.context.guests);
    const outcome = simulatePatch(setup.context, setup.plan, patch, TEST_TODAY_ISO);
    if (!outcome.ok) throw new Error(outcome.error);
    const figures = screen.getByRole('table', { name: 'Key figures' });
    const expectedRow = within(figures).getByRole('row', { name: /Guests likely to come/ });
    expect(expectedRow).toHaveTextContent(String(setup.plan.headcount.expected));
    expect(expectedRow).toHaveTextContent(String(outcome.value.after.headcount.expected));
    expect(screen.getByText(/The verdict (changes|stays):/)).toBeInTheDocument();
    expect(setup.onApplyPatch).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Apply this change' }));
    expect(setup.onApplyPatch).toHaveBeenCalledTimes(1);
    expect(setup.onApplyPatch).toHaveBeenCalledWith(patch);
  });

  it('lists the risks a change clears, with severity in words', async () => {
    const user = userEvent.setup();
    const setup = samplePanel('bengaluru-birthday');
    render(<WhatIfDrawer {...setup.props} />);
    await user.selectOptions(screen.getByLabelText('Venue'), 'indoor');
    const outcome = simulatePatch(
      setup.context,
      setup.plan,
      { ops: [{ op: 'setVenueSetting', value: 'indoor' }] },
      TEST_TODAY_ISO,
    );
    if (!outcome.ok) throw new Error(outcome.error);
    expect(outcome.value.diff.resolvedRisks.length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Risks cleared' })).toBeInTheDocument();
    for (const risk of outcome.value.diff.resolvedRisks) {
      const item = screen.getByText(risk.title, { exact: false });
      expect(item).toHaveTextContent(SEVERITY_STYLES[risk.severity].label);
    }
  });

  it('moves the budget by a percentage and applies the rounded amount', async () => {
    const user = userEvent.setup();
    const setup = samplePanel('jaipur-wedding');
    render(<WhatIfDrawer {...setup.props} />);
    fireEvent.change(screen.getByLabelText('Budget'), {
      target: { value: String(BUDGET_STEP_DOWN) },
    });
    const budget = shiftedBudget(setup.plan.contextEcho.budgetInr, BUDGET_STEP_DOWN);
    expect(screen.getByLabelText('Budget')).toHaveAttribute(
      'aria-valuetext',
      `${formatInr(budget)} (${BUDGET_STEP_DOWN}%)`,
    );
    await user.click(screen.getByRole('button', { name: 'Apply this change' }));
    expect(setup.onApplyPatch).toHaveBeenCalledWith({ ops: [{ op: 'setBudget', value: budget }] });
  });

  it('drops a function and resets to no change', async () => {
    const user = userEvent.setup();
    const setup = samplePanel('jaipur-wedding');
    const dropped = setup.plan.contextEcho.functions[0];
    if (dropped === undefined) throw new Error('the wedding sample has functions');
    render(<WhatIfDrawer {...setup.props} />);
    await user.selectOptions(screen.getByLabelText('Functions'), dropped);
    expect(screen.getByText('Trying:').parentElement).toHaveTextContent(
      `Drop the ${FUNCTION_PROFILES[dropped].label}`,
    );
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByText('Move any control above to compare.')).toBeInTheDocument();
  });

  it('starts again from no change when the plan itself changes', () => {
    const setup = samplePanel('jaipur-wedding');
    const { rerender } = render(<WhatIfDrawer {...setup.props} />);
    fireEvent.change(screen.getByLabelText('Guests'), {
      target: { value: String(setup.context.guests - FEWER) },
    });
    const next = samplePanel('jaipur-wedding');
    rerender(<WhatIfDrawer {...next.props} />);
    expect(screen.getByText('Move any control above to compare.')).toBeInTheDocument();
  });

  it('explains the change only when asked, with who answered', async () => {
    const user = userEvent.setup();
    const setup = samplePanel('jaipur-wedding');
    const patch = fewerGuestsPatch(setup.context.guests);
    const reply = askReply(explainQuestion(patch), setup);
    const fetchMock = stubFetch(jsonResponse(reply));
    render(<WhatIfDrawer {...setup.props} />);
    fireEvent.change(screen.getByLabelText('Guests'), {
      target: { value: String(setup.context.guests - FEWER) },
    });
    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Explain this change' }));
    expect(await screen.findByText(reply.answer)).toBeInTheDocument();
    expect(screen.getByText(provenanceText('ready', OFFLINE_PROVENANCE))).toBeInTheDocument();
    const body = String(fetchMock.mock.calls[0]?.[1]?.body);
    expect(JSON.parse(body)).toMatchObject({ question: explainQuestion(patch), history: [] });
  });
});
