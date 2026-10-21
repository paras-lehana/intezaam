/**
 * Responsibility: "Check what we read" — focus lands on its heading, it shows the one-line
 * understanding, a chip per filled field, the essentials still to answer and who read it,
 * and offers confirm and dismiss; with nothing found it only offers to set the read aside.
 * Both choices remove the review, so focus moves on: confirming to the first essential still
 * open in the form, setting aside back to the brief text — never to the page.
 * Boundary: the review comes from core's offline reader and evidence guard.
 */
import { type ReactElement, useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { BriefResponse } from '@intezaam/core/schemas';
import { OFFLINE_PLANNER } from '../../../components/features/common/ProvenanceBadge';
import {
  BRIEF_REVIEW_TITLE,
  BriefReview,
  CONFIRM_BRIEF,
  DISMISS_BRIEF,
} from '../../../components/features/workspace/BriefReview';
import {
  briefChips,
  draftToFill,
  missingPrompts,
  nextFieldAfterBrief,
} from '../../../components/features/workspace/brief-fill';
import { BRIEF_INPUT_ID, PlannerForm, type PlannerFormFill } from '../../../components/form';
import { plannerFieldId } from '../../../components/form/form-fields';
import { TEST_TODAY_ISO } from '../../helpers';
import { briefResponseFor } from '../plan-fixtures';

const review = briefResponseFor('Shaadi in Jaipur, 300 log');

/** The plan page's wiring: confirming removes the review and fills the form. */
function ReviewWithForm({ read }: { readonly read: BriefResponse }): ReactElement {
  const [open, setOpen] = useState(true);
  const [fill, setFill] = useState<PlannerFormFill | undefined>(undefined);
  function confirm(): void {
    setOpen(false);
    setFill({ id: 1, context: draftToFill(read.draft), complete: false });
  }
  return (
    <>
      {open ? (
        <BriefReview review={read} onConfirm={confirm} onDismiss={() => setOpen(false)} />
      ) : null}
      <PlannerForm
        formId="planner"
        todayIso={TEST_TODAY_ISO}
        onSubmit={vi.fn()}
        onReadBrief={vi.fn()}
        {...(fill === undefined ? {} : { fill })}
      />
    </>
  );
}

describe('BriefReview', () => {
  it('takes focus and shows what was read', () => {
    render(<BriefReview review={review} onConfirm={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByRole('heading', { name: BRIEF_REVIEW_TITLE })).toHaveFocus();
    const chips = within(screen.getByRole('list', { name: 'Details found' })).getAllByRole(
      'listitem',
    );
    expect(chips).toHaveLength(briefChips(review.draft, review.filled).length);
    for (const prompt of missingPrompts(review.missing)) {
      expect(screen.getByText(prompt)).toBeInTheDocument();
    }
    expect(screen.getByText(OFFLINE_PLANNER)).toBeInTheDocument();
  });

  it('confirms or sets aside on request', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onDismiss = vi.fn();
    render(<BriefReview review={review} onConfirm={onConfirm} onDismiss={onDismiss} />);
    await user.click(screen.getByRole('button', { name: CONFIRM_BRIEF }));
    await user.click(screen.getByRole('button', { name: DISMISS_BRIEF }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('hands focus to the first question still open after confirming', async () => {
    render(<ReviewWithForm read={review} />);
    await userEvent.setup().click(screen.getByRole('button', { name: CONFIRM_BRIEF }));
    expect(screen.queryByRole('heading', { name: BRIEF_REVIEW_TITLE })).not.toBeInTheDocument();
    const field = document.getElementById(plannerFieldId(nextFieldAfterBrief(review.missing)));
    expect(field).not.toBeNull();
    expect(field?.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(document.body);
  });

  it('returns focus to the brief text after setting the read aside', async () => {
    render(<ReviewWithForm read={review} />);
    await userEvent.setup().click(screen.getByRole('button', { name: DISMISS_BRIEF }));
    expect(screen.queryByRole('heading', { name: BRIEF_REVIEW_TITLE })).not.toBeInTheDocument();
    expect(document.activeElement).toHaveAttribute('id', BRIEF_INPUT_ID);
  });

  it('offers only "set aside" when nothing could be read', () => {
    const empty = briefResponseFor('hello there friends');
    expect(empty.filled).toHaveLength(0);
    render(<BriefReview review={empty} onConfirm={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.queryByRole('button', { name: CONFIRM_BRIEF })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: DISMISS_BRIEF })).toBeInTheDocument();
  });
});
