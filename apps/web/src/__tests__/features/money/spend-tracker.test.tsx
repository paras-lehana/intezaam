/**
 * Responsibility: the spend tracker — typed amounts parse as whole rupees, a line warns at
 * 90% and flags an overrun in words, the amounts are remembered on this device only, and
 * tampered storage is ignored. Boundary: planned amounts come from an engine-built plan;
 * the shares typed are derived from WARN_SHARE.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SpendTracker } from '../../../components/features/money/SpendTracker';
import { SPEND_STATUS_STYLES } from '../../../components/features/money/SpendStatusLabel';
import {
  SPEND_STORAGE_KEY,
  WARN_SHARE,
  parseRupees,
  readSpendBook,
  spendStatus,
  spentOf,
} from '../../../components/features/money/spend-tracker';
import { samplePlan } from '../plan-fixtures';

const { plan } = samplePlan('bengaluru-birthday');
const [line] = plan.budget.lines;

describe('spend arithmetic', () => {
  it('reads rupees the way people type them', () => {
    expect(parseRupees('₹1,50,000')).toBe(150_000);
    expect(parseRupees(' 2 000 ')).toBe(2000);
    expect(parseRupees('abc')).toBe(0);
    expect(parseRupees('-500')).toBe(0);
  });

  it('counts the larger of committed and paid, not both', () => {
    expect(spentOf({ committed: '50000', paid: '20000' })).toBe(50_000);
    expect(spentOf(undefined)).toBe(0);
  });

  it('warns from 90% and flags anything over the plan', () => {
    const planned = 100_000;
    expect(spendStatus(planned, 0)).toBe('clear');
    expect(spendStatus(planned, planned * WARN_SHARE - 1)).toBe('clear');
    expect(spendStatus(planned, planned * WARN_SHARE)).toBe('near');
    expect(spendStatus(planned, planned)).toBe('near');
    expect(spendStatus(planned, planned + 1)).toBe('over');
  });
});

describe('SpendTracker', () => {
  it('shows a line near its limit, in words, and remembers it on this device', async () => {
    const user = userEvent.setup();
    render(<SpendTracker plan={plan} />);
    const label = line?.label ?? '';
    const committed = screen.getByRole('textbox', { name: `Committed for ${label} (₹)` });
    const near = Math.ceil((line?.amountInr ?? 0) * WARN_SHARE);
    await user.type(committed, String(near));
    const row = within(committed.closest('tr') ?? document.body);
    expect(row.getByText(SPEND_STATUS_STYLES.near.label)).toBeInTheDocument();
    expect(readSpendBook()).toEqual({
      [line?.category ?? '']: { committed: String(near), paid: '' },
    });
  });

  it('flags a paid amount over the line and in the total', async () => {
    const user = userEvent.setup();
    render(<SpendTracker plan={plan} />);
    const label = line?.label ?? '';
    const over = plan.budget.totalInr + 1;
    await user.type(screen.getByRole('textbox', { name: `Paid for ${label} (₹)` }), String(over));
    expect(screen.getAllByText(SPEND_STATUS_STYLES.over.label)).toHaveLength(2);
  });

  it('restores typed amounts and ignores tampered storage', () => {
    const category = line?.category ?? 'venue';
    window.localStorage.setItem(
      SPEND_STORAGE_KEY,
      JSON.stringify({ [category]: { committed: '1200', paid: '' } }),
    );
    const { unmount } = render(<SpendTracker plan={plan} />);
    expect(
      screen.getByRole('textbox', { name: `Committed for ${line?.label ?? ''} (₹)` }),
    ).toHaveValue('1200');
    unmount();
    window.localStorage.setItem(SPEND_STORAGE_KEY, '{"venue":{"committed":42}}');
    expect(readSpendBook()).toEqual({});
    window.localStorage.setItem(SPEND_STORAGE_KEY, 'not json');
    expect(readSpendBook()).toEqual({});
  });
});
