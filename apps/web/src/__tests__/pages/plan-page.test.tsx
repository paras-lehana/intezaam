/**
 * Responsibility: the plan page flow — fill a sample, plan it, and the engine's plan appears at
 * once with focus on its heading, the eight tabs, an announcement and then the narration; a
 * lever re-plans; a read brief is reviewed and only fills the form on confirm. Arriving with
 * a `#plan=` link or a saved plan is covered in plan-page-arrival.test.tsx.
 * Boundary: fetch is stubbed; "today" is pinned so the browser builds exactly the fixture plan.
 */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { SAMPLE_CONTEXTS } from '@intezaam/core/domain';
import { provenanceText } from '../../components/features/common/ProvenanceBadge';
import { CONFIRM_BRIEF } from '../../components/features/workspace/BriefReview';
import { BRIEF_BUTTON } from '../../components/form/BriefBox';
import { DEFAULT_SUBMIT_LABEL } from '../../components/form/PlannerForm';
import { planAnnouncement } from '../../lib/plan-state';
import { confirmStatus } from '../../lib/use-brief-reader';
import { UPDATE_LABEL } from '../../pages/PlanPage';
import {
  GEMINI_PROVENANCE,
  briefResponseFor,
  narrationResponseFor,
} from '../features/plan-fixtures';
import { answerWith, planHeading, renderPage, resetPage, wedding } from './plan-page-harness';

/** A lazy panel's chunk is transformed on first import, which is slow in a loaded test run. */
const LAZY_PANEL_TIMEOUT_MS = 5000;
/** Room for the lazy import plus the clicks around it. */
const FLOW_TEST_TIMEOUT_MS = 15_000;

/** The form's own submit button (the phone's sticky bar repeats it). */
function formButton(name: string): HTMLElement {
  const form = screen.getByRole('form', { name: 'Your celebration' });
  return within(form).getByRole('button', { name });
}

async function planSample(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const sample = SAMPLE_CONTEXTS['jaipur-wedding'].label;
  await user.click(screen.getByRole('button', { name: new RegExp(sample) }));
  await user.click(formButton(DEFAULT_SUBMIT_LABEL));
}

beforeEach(resetPage);

describe('planning from the form', () => {
  it('shows the plan at once, focuses its heading, then adds the narration', async () => {
    const user = userEvent.setup();
    answerWith(narrationResponseFor(wedding.plan));
    renderPage();
    expect(screen.getByRole('heading', { name: 'Your plan appears here' })).toBeInTheDocument();
    await planSample(user);
    expect(planHeading()).toHaveFocus();
    expect(
      within(screen.getByRole('tablist', { name: 'Plan sections' })).getAllByRole('tab'),
    ).toHaveLength(8);
    expect(screen.getByText(planAnnouncement(wedding.plan, 'submit'))).toBeInTheDocument();
    expect(formButton(UPDATE_LABEL)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Plan/, pressed: true })).toBeInTheDocument();
    const narrated = provenanceText('ready', GEMINI_PROVENANCE);
    expect((await screen.findAllByText(narrated)).length).toBeGreaterThan(0);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it(
    're-plans when a lever is applied',
    async () => {
      const user = userEvent.setup();
      answerWith(narrationResponseFor(wedding.plan));
      renderPage();
      await planSample(user);
      await user.click(screen.getByRole('tab', { name: 'Money' }));
      const lever = wedding.plan.levers.find((candidate) => candidate.patch !== undefined);
      expect(lever).toBeDefined();
      const apply = `Apply: ${lever?.title ?? ''}`;
      await user.click(
        await screen.findByRole('button', { name: apply }, { timeout: LAZY_PANEL_TIMEOUT_MS }),
      );
      await waitFor(() => expect(screen.getByText(/^Plan updated/)).toBeInTheDocument());
      // The applied lever's change is now part of the plan, so it is no longer offered.
      expect(screen.queryByRole('button', { name: apply })).not.toBeInTheDocument();
    },
    FLOW_TEST_TIMEOUT_MS,
  );
});

describe('reading a brief', () => {
  it('fills the form only after the reader confirms', async () => {
    const user = userEvent.setup();
    const brief = 'Shaadi in Jaipur, 300 log, 25 lakh';
    const reply = briefResponseFor(brief);
    answerWith(reply);
    renderPage();
    await user.type(screen.getByRole('textbox', { name: /Describe it in your words/ }), brief);
    await user.click(screen.getByRole('button', { name: BRIEF_BUTTON }));
    const review = await screen.findByRole('heading', { name: 'Check what we read' });
    expect(review).toHaveFocus();
    expect(screen.getByRole('textbox', { name: 'Guests invited' })).toHaveValue('');
    await user.click(screen.getByRole('button', { name: CONFIRM_BRIEF }));
    expect(screen.getByRole('textbox', { name: 'Guests invited' })).toHaveValue(
      String(reply.draft.guests),
    );
    expect(screen.getByRole('combobox', { name: 'City or town' })).toHaveValue(reply.draft.city);
    expect(screen.getByText(confirmStatus(reply.filled.length))).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Check what we read' })).not.toBeInTheDocument();
  });
});
