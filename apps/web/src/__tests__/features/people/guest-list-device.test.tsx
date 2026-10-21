/**
 * Responsibility: the guest list stays on this device — a party added by hand is saved in
 * local storage, a second mount reads it back, and nothing is sent over the network.
 * Boundary: storage is jsdom's real localStorage under the key the store exports; only fetch
 * is stubbed, to prove it is never called.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { GUEST_LIST_STORAGE_KEY } from '../../../components/features/people/guest-store';
import { GuestList } from '../../../components/features/people/GuestList';
import { stubFetch } from '../../helpers';
import { samplePanel } from '../panel-fixtures';

function renderBirthdayList(): void {
  const setup = samplePanel('bengaluru-birthday');
  render(
    <GuestList
      plan={setup.plan}
      plannedGuests={setup.context.guests}
      onApplyPatch={setup.onApplyPatch}
    />,
  );
}

describe('GuestList on this device', () => {
  it('remembers the list on this device only', async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch();
    renderBirthdayList();
    await user.type(screen.getByLabelText('Name or family'), 'Iyer family');
    await user.click(screen.getByRole('button', { name: 'Add to the list' }));
    expect(window.localStorage.getItem(GUEST_LIST_STORAGE_KEY)).toContain('Iyer family');
    expect(screen.queryByLabelText('Side')).not.toBeInTheDocument();
    renderBirthdayList();
    const tables = screen.getAllByRole('table', { name: 'Your guest list' });
    expect(
      within(tables[1] ?? document.body).getByRole('rowheader', { name: 'Iyer family' }),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
