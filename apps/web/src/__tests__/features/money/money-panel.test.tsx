/**
 * Responsibility: the Money tab renders its plan section — a captioned budget table whose rows
 * are the plan's lines and whose footer is the total, per-function slices only when there is
 * more than one function, the bottom-up check in words, GST per line, cash needed by month
 * with the assumption label — and its controls re-plan through onApplyPatch.
 * Boundary: plans from the engine; expected rows, amounts and patches derived from them.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { formatInr } from '@intezaam/core';
import { CATEGORY_PROFILES, RANKABLE_CATEGORIES } from '@intezaam/core/domain';
import { ASSUMPTION_BADGE } from '../../../components/features/common/ConfidenceLabel';
import { formatMonthKey } from '../../../components/features/common/dates';
import { toggleableCategories } from '../../../components/features/money/CategoryControls';
import { MoneyPanel } from '../../../components/features/money/MoneyPanel';
import { formatShare } from '../../../components/features/money/money-format';
import { panelProps } from '../plan-fixtures';

function table(caption: string): HTMLElement {
  return screen.getByRole('table', { name: caption });
}

describe('budget table', () => {
  it('has one row per budget line and a total that matches the plan', () => {
    const props = panelProps('jaipur-wedding');
    const { budget } = props.plan;
    render(<MoneyPanel {...props} />);
    const budgetTable = table('Budget by category');
    const [, body, foot] = within(budgetTable).getAllByRole('rowgroup');
    expect(within(body ?? budgetTable).getAllByRole('row')).toHaveLength(budget.lines.length);
    for (const line of budget.lines) {
      const row = within(budgetTable).getByRole('rowheader', {
        name: new RegExp(`^${line.label}`),
      });
      const cells = within(row.closest('tr') ?? budgetTable);
      expect(cells.getByText(formatInr(line.amountInr))).toBeInTheDocument();
      expect(cells.getByText(formatShare(line.shareBp))).toBeInTheDocument();
    }
    expect(within(foot ?? budgetTable).getByText(formatInr(budget.totalInr))).toBeInTheDocument();
    expect(budget.lines.reduce((sum, line) => sum + line.amountInr, 0)).toBe(budget.totalInr);
  });

  it('gives every line its own "Why this?"', () => {
    const props = panelProps('bengaluru-birthday');
    render(<MoneyPanel {...props} />);
    for (const line of props.plan.budget.lines) {
      expect(screen.getByRole('button', { name: `Why this? ${line.label}` })).toBeInTheDocument();
    }
  });
});

describe('sections', () => {
  it('splits a multi-function plan by function, and not a single-function one', () => {
    const wedding = panelProps('jaipur-wedding');
    const { unmount } = render(<MoneyPanel {...wedding} />);
    const slices = table('Budget by function');
    for (const slice of wedding.plan.budget.byFunction) {
      expect(within(slices).getByRole('rowheader', { name: slice.label })).toBeInTheDocument();
    }
    unmount();
    render(<MoneyPanel {...panelProps('bengaluru-birthday')} />);
    expect(screen.queryByRole('table', { name: 'Budget by function' })).not.toBeInTheDocument();
  });

  it('says in words whether the food line covers the meals', () => {
    const props = panelProps('jaipur-wedding');
    render(<MoneyPanel {...props} />);
    const check = screen.getByRole('region', { name: 'Bottom-up check' });
    expect(props.plan.costCheck.status).toBe('short');
    expect(within(check).getByText(/Short by about/)).toBeInTheDocument();
  });

  it('lists GST per line and the cash needed each month, labelled as an assumption', () => {
    const props = panelProps('jaipur-wedding');
    const { gst, payments } = props.plan;
    render(<MoneyPanel {...props} />);
    const gstTable = table('GST by category');
    for (const line of gst.lines) {
      expect(
        within(gstTable).getByRole('rowheader', { name: CATEGORY_PROFILES[line.category].label }),
      ).toBeInTheDocument();
    }
    const cash = table('Cash needed by month');
    for (const month of payments.cashflow) {
      expect(
        within(cash).getByRole('rowheader', { name: formatMonthKey(month.monthIso) }),
      ).toBeInTheDocument();
    }
    expect(payments.assumption).toBe(true);
    const calendar = screen.getByRole('region', { name: 'Cash needed each month' });
    expect(within(calendar).getByText(ASSUMPTION_BADGE)).toBeInTheDocument();
  });
});

describe('adjusting the split', () => {
  it('switches a category off through a typed change', async () => {
    const user = userEvent.setup();
    const props = panelProps('jaipur-wedding');
    render(<MoneyPanel {...props} />);
    const [category] = toggleableCategories(props.plan, props.context);
    expect(category).toBeDefined();
    const label = category === undefined ? '' : CATEGORY_PROFILES[category].label;
    const box = screen.getByRole('checkbox', { name: label });
    expect(box).toBeChecked();
    await user.click(box);
    expect(props.onApplyPatch).toHaveBeenCalledWith({
      ops: [{ op: 'toggleCategory', value: category, enabled: false }],
    });
  });

  it('never offers contingency as a switch', () => {
    const props = panelProps('jaipur-wedding');
    expect(toggleableCategories(props.plan, props.context)).not.toContain('contingency');
  });

  it('makes a category the top priority, showing the current ones as pressed', async () => {
    const user = userEvent.setup();
    const props = panelProps('jaipur-wedding');
    render(<MoneyPanel {...props} />);
    const group = screen.getByRole('group', { name: 'Make it the top priority' });
    const [current] = props.context.priorities;
    const currentLabel = current === undefined ? '' : CATEGORY_PROFILES[current].label;
    expect(within(group).getByRole('button', { name: currentLabel })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // The first rankable line not yet a priority: the button the reader would press next.
    const target = props.plan.budget.lines
      .map((line) => line.category)
      .find(
        (category) =>
          RANKABLE_CATEGORIES.some((rankable) => rankable === category) &&
          !props.context.priorities.some((priority) => priority === category),
      );
    expect(target).toBeDefined();
    const targetLabel = target === undefined ? '' : CATEGORY_PROFILES[target].label;
    const button = within(group).getByRole('button', { name: targetLabel });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await user.click(button);
    expect(props.onApplyPatch).toHaveBeenCalledTimes(1);
    expect(props.onApplyPatch).toHaveBeenCalledWith({
      ops: [{ op: 'setPriority', value: target }],
    });
  });
});
