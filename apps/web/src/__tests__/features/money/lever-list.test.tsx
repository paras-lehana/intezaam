/**
 * Responsibility: levers — each shows its saving and the money verdict after the change;
 * "Apply" sends exactly the engine's typed patch through onApplyPatch; a lever without a
 * patch says to change the form; a plan with nothing to close says so. Boundary: levers come
 * from plans the engine built; nothing is priced here.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { formatInr } from '@intezaam/core';
import { MONEY_LABELS } from '@intezaam/core/engine';
import type { ContextPatch } from '@intezaam/core/schemas';
import { APPLY, LeverList, NO_LEVERS } from '../../../components/features/money/LeverList';
import { samplePlan } from '../plan-fixtures';

const { plan } = samplePlan('jaipur-wedding');

describe('LeverList', () => {
  it('shows each lever with its saving and the verdict after it', () => {
    render(<LeverList plan={plan} onApplyPatch={vi.fn()} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(plan.levers.length);
    plan.levers.forEach((lever, index) => {
      const item = within(items[index] ?? document.body);
      expect(item.getByRole('heading', { name: lever.title })).toBeInTheDocument();
      expect(item.getByText(formatInr(lever.savingInr))).toBeInTheDocument();
      expect(item.getByText(MONEY_LABELS[lever.newMoneyStatus])).toBeInTheDocument();
    });
  });

  it('applies a lever by sending its own typed patch', async () => {
    const user = userEvent.setup();
    const onApplyPatch = vi.fn<(patch: ContextPatch) => void>();
    render(<LeverList plan={plan} onApplyPatch={onApplyPatch} />);
    const lever = plan.levers.find((candidate) => candidate.patch !== undefined);
    expect(lever).toBeDefined();
    await user.click(screen.getByRole('button', { name: `${APPLY}: ${lever?.title ?? ''}` }));
    expect(onApplyPatch).toHaveBeenCalledTimes(1);
    expect(onApplyPatch).toHaveBeenCalledWith(lever?.patch);
  });

  it('offers no Apply for a lever the form must change', () => {
    render(<LeverList plan={plan} onApplyPatch={vi.fn()} />);
    const formOnly = plan.levers.filter((lever) => lever.patch === undefined);
    expect(formOnly.length).toBeGreaterThan(0);
    expect(screen.getAllByText('Make this change in the form.')).toHaveLength(formOnly.length);
    expect(screen.getAllByRole('button', { name: new RegExp(`^${APPLY}:`) })).toHaveLength(
      plan.levers.length - formOnly.length,
    );
  });

  it('says there is nothing to close when the budget covers the plan', () => {
    const birthday = samplePlan('bengaluru-birthday').plan;
    expect(birthday.levers).toHaveLength(0);
    render(<LeverList plan={birthday} onApplyPatch={vi.fn()} />);
    expect(screen.getByText(NO_LEVERS)).toBeInTheDocument();
  });
});
