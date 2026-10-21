/**
 * Responsibility: the What-if drawer's vendor-cancellation check — picking how long before
 * the event a vendor cancels shows how far ahead that vendor is usually booked and asks for
 * a back-up. Boundary: the expected lead time comes from `cancelImpact` on the same sample
 * plan, never a hand-typed number.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { cancelImpact } from '../../../components/features/what-if/vendor-cancel';
import { WhatIfDrawer } from '../../../components/features/what-if/WhatIfDrawer';
import { samplePanel } from '../panel-fixtures';

describe('VendorCancelNote', () => {
  it('checks what a vendor cancelling would cost, from the plan', async () => {
    const user = userEvent.setup();
    const setup = samplePanel('jaipur-wedding');
    const vendor = setup.plan.vendors[0];
    if (vendor === undefined) throw new Error('the wedding sample has vendors');
    render(<WhatIfDrawer {...setup.props} />);
    await user.selectOptions(screen.getByLabelText('Cancels this long before'), '7');
    const impact = cancelImpact(setup.plan, vendor.vendorType, 7);
    expect(
      screen.getByText(
        new RegExp(`usually booked about ${impact?.usualLeadDays ?? -1} days ahead`),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/line up a back-up now/)).toBeInTheDocument();
  });
});
