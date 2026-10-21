/**
 * Responsibility: arriving at the plan page with a plan — a shared `#plan=` link opens its
 * plan straight away, a broken link is reported in the plan pane, and "Continue your last
 * plan" restores the context saved on this device. Boundary: fetch is stubbed; "today" is
 * pinned so the browser builds exactly the fixture plan.
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { encodeContextForUrl } from '@intezaam/core/export';
import { continueLabel } from '../../components/features/workspace/EmptyWorkspace';
import { PLAN_FRAGMENT_PREFIX, planAnnouncement, storeLastContext } from '../../lib/plan-state';
import { narrationResponseFor } from '../features/plan-fixtures';
import { answerWith, planHeading, renderPage, resetPage, wedding } from './plan-page-harness';

beforeEach(resetPage);

describe('arriving with a plan', () => {
  it('opens a shared #plan= link straight away', () => {
    answerWith(narrationResponseFor(wedding.plan));
    window.history.replaceState(
      null,
      '',
      `#${PLAN_FRAGMENT_PREFIX}${encodeContextForUrl(wedding.context)}`,
    );
    renderPage();
    expect(planHeading()).toBeInTheDocument();
    expect(screen.getByText(planAnnouncement(wedding.plan, 'link'))).toBeInTheDocument();
  });

  it('reports a broken share link', () => {
    answerWith(narrationResponseFor(wedding.plan));
    window.history.replaceState(null, '', `#${PLAN_FRAGMENT_PREFIX}v1.broken`);
    renderPage();
    const pane = within(screen.getByRole('region', { name: 'Your plan' }));
    expect(pane.getByRole('alert')).not.toBeEmptyDOMElement();
    expect(pane.getByRole('heading', { name: 'Your plan appears here' })).toBeInTheDocument();
  });

  it('continues the last plan from this device on request', async () => {
    const user = userEvent.setup();
    answerWith(narrationResponseFor(wedding.plan));
    storeLastContext(wedding.context);
    renderPage();
    await user.click(screen.getByRole('button', { name: continueLabel(wedding.context) }));
    expect(planHeading()).toHaveFocus();
    expect(screen.getByRole('textbox', { name: 'Guests invited' })).toHaveValue(
      String(wedding.context.guests),
    );
  });
});
