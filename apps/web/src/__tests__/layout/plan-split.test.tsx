/**
 * Responsibility: PlanSplit — the "Details | Plan" switch is a pressed-state group the page
 * controls, both panes stay mounted, and the sticky bar submits the form through `form=`.
 * Boundary: a small harness form stands in for the planner form.
 */
import { type ReactElement, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_ACTION_LABEL,
  DETAILS_PANE_ID,
  PlanSplit,
} from '../../components/layout/PlanSplit';
import { type SplitView, SPLIT_VIEW_LABELS } from '../../components/layout/SplitSwitch';

const FORM_ID = 'split-test-form';

interface HarnessProps {
  readonly onSubmit: () => void;
  readonly planReady?: boolean;
}

function Harness({ onSubmit, planReady = false }: HarnessProps): ReactElement {
  const [view, setView] = useState<SplitView>('details');
  return (
    <PlanSplit
      view={view}
      onViewChange={setView}
      formId={FORM_ID}
      planReady={planReady}
      details={
        <form
          id={FORM_ID}
          aria-label="Details form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label htmlFor="split-name">Name</label>
          <input id="split-name" />
        </form>
      }
      workspace={<p>Workspace content</p>}
    />
  );
}

describe('PlanSplit', () => {
  it('switches panes with pressed-state buttons and keeps both mounted', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness onSubmit={vi.fn()} />);
    const details = screen.getByRole('button', { name: SPLIT_VIEW_LABELS.details });
    const plan = screen.getByRole('button', { name: SPLIT_VIEW_LABELS.plan });
    expect(details).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('.plan-split')).toHaveAttribute('data-view', 'details');
    await user.type(screen.getByLabelText('Name'), 'Meena');
    await user.click(plan);
    expect(plan).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('.plan-split')).toHaveAttribute('data-view', 'plan');
    // The form was never unmounted, so what was typed is still there.
    expect(screen.getByLabelText('Name')).toHaveValue('Meena');
    expect(screen.getByText('Workspace content')).toBeInTheDocument();
  });

  it('labels both panes and anchors the details pane for /plan#details', () => {
    render(<Harness onSubmit={vi.fn()} />);
    expect(screen.getByRole('region', { name: 'Your details' })).toHaveAttribute(
      'id',
      DETAILS_PANE_ID,
    );
    expect(screen.getByRole('region', { name: 'Your plan' })).toBeInTheDocument();
  });

  it('submits the form from the sticky action bar', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    const action = screen.getByRole('button', { name: DEFAULT_ACTION_LABEL });
    expect(action).toHaveAttribute('form', FORM_ID);
    await user.click(action);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('says in words when the plan is ready', () => {
    render(<Harness onSubmit={vi.fn()} planReady />);
    expect(screen.getByRole('button', { name: /Plan\s*ready/ })).toBeInTheDocument();
  });
});
