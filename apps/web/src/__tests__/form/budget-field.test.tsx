/**
 * Responsibility: the fifth essential — a typed amount is read back in Indian grouping (and not
 * when it is not a number), the round presets follow the family (wedding ones before a family
 * is chosen), a preset tap fills the amount and shows as pressed, and "Estimate it for me"
 * swaps the amount for a note. Boundary: rendered alone in the section harness; presets come
 * from the field's own table and every rupee string from core's formatters.
 */
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { formatInr, formatLakh } from '@intezaam/core';
import { BUDGET_PRESETS, BudgetField } from '../../components/form/BudgetField';
import { renderSection } from './section-harness';

const AMOUNT_NAME = 'Budget in rupees (₹)';
const PRESETS_NAME = 'Quick budget amounts';

/** A typed budget of fifteen lakh (test-owned input). */
const TYPED = 1_500_000;

describe('BudgetField', () => {
  it('reads a typed amount back in rupees, and stays quiet for text that is not one', async () => {
    const { user } = renderSection(BudgetField);
    const amount = screen.getByRole('textbox', { name: AMOUNT_NAME });
    await user.type(amount, String(TYPED));
    expect(amount).toHaveAccessibleDescription(`That is ${formatInr(TYPED)}.`);
    await user.clear(amount);
    await user.type(amount, 'lots');
    expect(amount).not.toHaveAccessibleDescription();
  });

  it('offers the wedding presets before a family is chosen', () => {
    renderSection(BudgetField);
    const presets = within(screen.getByRole('group', { name: PRESETS_NAME }));
    expect(presets.getAllByRole('button').map((button) => button.textContent)).toEqual(
      BUDGET_PRESETS.wedding.map(formatLakh),
    );
  });

  it('fills the amount from a preset for the chosen family and marks it pressed', async () => {
    const [preset] = BUDGET_PRESETS.birthday;
    expect(preset).toBeDefined();
    if (preset === undefined) return;
    const { user, latest } = renderSection(BudgetField, { start: { family: 'birthday' } });
    const button = screen.getByRole('button', { name: formatLakh(preset) });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await user.click(button);
    expect(latest().budget).toBe(String(preset));
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('swaps the amount and presets for a note when asked to estimate', async () => {
    const { user, latest } = renderSection(BudgetField);
    await user.click(screen.getByRole('checkbox', { name: 'Estimate it for me' }));
    expect(latest().estimateBudget).toBe(true);
    expect(screen.queryByRole('textbox', { name: AMOUNT_NAME })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: PRESETS_NAME })).not.toBeInTheDocument();
    expect(screen.getByText(/We will estimate/)).toBeInTheDocument();
  });
});
