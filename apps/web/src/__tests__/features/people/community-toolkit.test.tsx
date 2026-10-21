/**
 * Responsibility: the rest of the community toolkit — the ledger balances what was collected
 * against what was spent, adds the committee's own rows and downloads a formula-safe CSV, and
 * each volunteer role gets its own WhatsApp message. Boundary: numbers come from `buildPlan`
 * and the pure ledger module, never from hand-worked sums. The chanda planner is covered in
 * chanda-planner.test.tsx.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { formatInr } from '@intezaam/core';
import { buildWhatsAppUrl } from '@intezaam/core/integrations';
import { ledgerToCsv, seedLedger } from '../../../components/features/people/ledger';
import { PeoplePanel } from '../../../components/features/people/PeoplePanel';
import { roleMessage } from '../../../components/features/people/VolunteerRoster';
import { captureDownloads, communityPanel } from '../panel-fixtures';

describe('committee ledger', () => {
  it('balances actual collections against spending and downloads the CSV', async () => {
    const user = userEvent.setup();
    const { plan, props } = communityPanel();
    const community = plan.community;
    const first = community === undefined ? undefined : seedLedger(community)[0];
    if (community === undefined || first === undefined)
      throw new Error('the ledger is seeded from the plan');
    const capture = captureDownloads();
    render(<PeoplePanel {...props} />);
    await user.type(screen.getByLabelText(`Actual amount, ${first.label}`), '5000');
    const balance = first.kind === 'collected' ? 'Surplus' : 'Deficit';
    expect(screen.getByText(`${balance} ${formatInr(5000)}`)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Download the ledger (CSV)' }));
    const rows = seedLedger(community).map((row) =>
      row.id === first.id ? { ...row, actual: '5000' } : row,
    );
    expect(await capture.files[0]?.text()).toBe(ledgerToCsv(rows));
  });

  it('adds the committee’s own rows, and asks for a label and amount', async () => {
    const user = userEvent.setup();
    render(<PeoplePanel {...communityPanel().props} />);
    await user.click(screen.getByRole('button', { name: 'Add to the ledger' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Add what the money is for and the amount.',
    );
    await user.type(screen.getByLabelText('What for'), 'Flat 12B contribution');
    await user.type(screen.getByLabelText('Amount (₹)'), '1100');
    await user.click(screen.getByRole('button', { name: 'Add to the ledger' }));
    expect(screen.getByRole('rowheader', { name: 'Flat 12B contribution' })).toBeInTheDocument();
  });
});

describe('volunteer roster', () => {
  it('opens WhatsApp with each role’s message, named after its lead', async () => {
    const user = userEvent.setup();
    const { plan, props } = communityPanel();
    const volunteer = plan.community?.volunteers[0];
    if (volunteer === undefined) throw new Error('the society sample needs volunteers');
    render(<PeoplePanel {...props} />);
    const section = screen.getByRole('region', { name: 'Volunteer roster' });
    const [leadField] = within(section).getAllByLabelText('Who leads it');
    if (leadField === undefined) throw new Error('every role has a lead field');
    await user.type(leadField, 'Ravi');
    const link = within(section).getByRole('link', {
      name: new RegExp(`about ${volunteer.label}`),
    });
    expect(link).toHaveAttribute('href', buildWhatsAppUrl(roleMessage(plan, volunteer, 'Ravi')));
  });
});
