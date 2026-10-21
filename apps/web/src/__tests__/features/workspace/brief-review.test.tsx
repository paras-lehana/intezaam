/**
 * Responsibility: "Check what we read" — focus lands on its heading, it shows the one-line
 * understanding, a chip per filled field, the essentials still to answer and who read it,
 * and offers confirm and dismiss; with nothing found it only offers to set the read aside.
 * Boundary: the review comes from core's offline reader and evidence guard.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OFFLINE_PLANNER } from '../../../components/features/common/ProvenanceBadge';
import {
  BRIEF_REVIEW_TITLE,
  BriefReview,
  CONFIRM_BRIEF,
  DISMISS_BRIEF,
} from '../../../components/features/workspace/BriefReview';
import { briefChips, missingPrompts } from '../../../components/features/workspace/brief-fill';
import { briefResponseFor } from '../plan-fixtures';

const review = briefResponseFor('Shaadi in Jaipur, 300 log');

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

  it('offers only "set aside" when nothing could be read', () => {
    const empty = briefResponseFor('hello there friends');
    expect(empty.filled).toHaveLength(0);
    render(<BriefReview review={empty} onConfirm={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.queryByRole('button', { name: CONFIRM_BRIEF })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: DISMISS_BRIEF })).toBeInTheDocument();
  });
});
