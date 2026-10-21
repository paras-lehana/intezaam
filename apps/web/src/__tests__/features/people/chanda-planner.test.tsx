/**
 * Responsibility: the chanda (contribution) planner — it shows the plan's own per-household
 * amount and funding status, re-plans an edited sponsor amount and flat-size tiers through
 * the engine, asks for the community details first and flags numbers out of range. Boundary:
 * numbers come from `buildPlan` and the pure chanda module, never from hand-worked sums.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { formatInr } from '@intezaam/core';
import { FUNDING_LABELS } from '@intezaam/core/engine';
import { chandaDraft, withChanda } from '../../../components/features/people/chanda';
import { PeoplePanel } from '../../../components/features/people/PeoplePanel';
import { communityPanel, planFor } from '../panel-fixtures';

/** A sponsor amount the committee types in this test. */
const NEW_SPONSORS = '₹1,20,000';

describe('chanda planner', () => {
  it('shows the plan’s per-household amount and funding status', () => {
    const { plan, props } = communityPanel();
    render(<PeoplePanel {...props} />);
    const money = plan.community?.contribution;
    const section = screen.getByRole('region', { name: 'Contribution (chanda) planner' });
    const row = within(section).getByRole('row', {
      name: new RegExp(`Each of ${money?.households ?? -1} households`),
    });
    expect(row).toHaveTextContent(formatInr(money?.perHouseholdInr ?? -1));
    const status = plan.verdict.funding?.status;
    if (status !== undefined) expect(section).toHaveTextContent(FUNDING_LABELS[status]);
  });

  it('re-plans an edited sponsor amount through the engine', async () => {
    const user = userEvent.setup();
    const { context, props } = communityPanel();
    const extras = context.community;
    if (extras === undefined) throw new Error('the society sample has community details');
    render(<PeoplePanel {...props} />);
    const sponsors = screen.getByLabelText('Sponsors (₹)');
    await user.clear(sponsors);
    await user.type(sponsors, NEW_SPONSORS);
    const expected = planFor(
      withChanda(context, extras, { ...chandaDraft(extras), sponsors: NEW_SPONSORS }),
    );
    const section = screen.getByRole('region', { name: 'Contribution (chanda) planner' });
    const perHousehold = expected.community?.contribution.perHouseholdInr ?? -1;
    expect(within(section).getByRole('row', { name: /Each of/ })).toHaveTextContent(
      formatInr(perHousehold),
    );
    expect(section).toHaveTextContent('A preview');
  });

  it('splits by flat size with the engine’s tiered shares', async () => {
    const user = userEvent.setup();
    const { context, props } = communityPanel();
    const extras = context.community;
    if (extras === undefined) throw new Error('the society sample has community details');
    render(<PeoplePanel {...props} />);
    await user.click(screen.getByRole('radio', { name: 'By flat size' }));
    const typed = { small: '60', medium: '120', large: '60' };
    await user.type(screen.getByLabelText(/Small flats/), typed.small);
    await user.type(screen.getByLabelText(/Medium flats/), typed.medium);
    await user.type(screen.getByLabelText(/Large flats/), typed.large);
    const tiers =
      planFor(withChanda(context, extras, { ...chandaDraft(extras), mode: 'tiered', tiers: typed }))
        .community?.contribution.tiers ?? [];
    expect(tiers).toHaveLength(3);
    const section = screen.getByRole('region', { name: 'Contribution (chanda) planner' });
    for (const tier of tiers) {
      const row = within(section).getByRole('row', {
        name: new RegExp(`${tier.households} ${tier.size} flats`),
      });
      expect(row).toHaveTextContent(formatInr(tier.perHouseholdInr));
    }
  });

  it('asks for the community details before working out shares', () => {
    const setup = communityPanel();
    const { community: _community, ...withoutDetails } = setup.context;
    render(
      <PeoplePanel {...setup.props} context={withoutDetails} plan={planFor(withoutDetails)} />,
    );
    expect(
      screen.queryByRole('region', { name: 'Contribution (chanda) planner' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Add the households, sponsors and RWA fund/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Ledger: collected and spent' })).toBeInTheDocument();
  });

  it('says so when the numbers are out of range', async () => {
    const user = userEvent.setup();
    render(<PeoplePanel {...communityPanel().props} />);
    const households = screen.getByLabelText('Households contributing');
    await user.clear(households);
    await user.type(households, '0');
    expect(screen.getByRole('alert')).toHaveTextContent('out of range');
  });
});
