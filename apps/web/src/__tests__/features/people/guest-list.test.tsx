/**
 * Responsibility: the browser-only guest list — a party added by hand or a CSV imported with
 * Hinglish words is counted in people (not rows), an RSVP change and a removal recount, a
 * removal or a clear keeps focus in the section (next Remove button, else the name box) and
 * is announced, "Plan for N guests" sends only a head count, the export is formula-safe, and
 * nothing is sent over the network (device storage is in guest-list-device.test.tsx). Boundary: counts
 * and CSV text come from the pure modules under test (`importGuests`, `countGuests`).
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  MAX_IMPORT_BYTES,
  guestsToCsv,
  importGuests,
} from '../../../components/features/people/guest-csv';
import { TOO_LARGE } from '../../../components/features/people/GuestImport';
import { CLEARED, GuestList } from '../../../components/features/people/GuestList';
import { countGuests } from '../../../components/features/people/guest-rules';
import { stubFetch } from '../../helpers';
import { captureDownloads, samplePanel } from '../panel-fixtures';

/** A Hinglish spreadsheet export this test owns: one row has no name and is skipped. */
const HINGLISH_CSV = [
  'Naam,Log,Bachche,Khana,RSVP,Paksh',
  'Sharma ji,2,1,NV,haan,ladkiwale',
  'Gupta parivar,3,0,shakahari,nahi,ladkewale',
  '"=HYPERLINK(""http://x"")",1,0,jain,shayad,dono',
  ',1,0,veg,haan,dono',
].join('\n');

function renderList(
  id: Parameters<typeof samplePanel>[0] = 'jaipur-wedding',
): ReturnType<typeof samplePanel> {
  const setup = samplePanel(id);
  render(
    <GuestList
      plan={setup.plan}
      plannedGuests={setup.context.guests}
      onApplyPatch={setup.onApplyPatch}
    />,
  );
  return setup;
}

async function importCsv(text: string): Promise<void> {
  const file = new File([text], 'guests.csv', { type: 'text/csv' });
  await userEvent.setup().upload(screen.getByLabelText(/Import a CSV/), file);
}

describe('GuestList', () => {
  it('imports Hinglish CSV rows and counts people, not rows', async () => {
    const fetchMock = stubFetch();
    renderList();
    await importCsv(HINGLISH_CSV);
    const { guests, skipped } = importGuests(HINGLISH_CSV, 'expected');
    const counts = countGuests(guests);
    expect(
      await screen.findByText(
        `Added ${guests.length} parties (${counts.people} people); ${skipped} rows without a name were skipped.`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(`${counts.people}`, { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${counts.confirmed} confirmed`))).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a file too large to be a guest list', async () => {
    renderList();
    await importCsv('x'.repeat(MAX_IMPORT_BYTES + 1));
    expect(await screen.findByRole('alert')).toHaveTextContent(TOO_LARGE);
    expect(screen.queryByRole('table', { name: 'Your guest list' })).not.toBeInTheDocument();
  });

  it('exports a formula-safe CSV for Google Sheets', async () => {
    const user = userEvent.setup();
    const capture = captureDownloads();
    renderList();
    await importCsv(HINGLISH_CSV);
    await user.click(await screen.findByRole('button', { name: /Download the list/ }));
    const text = (await capture.files[0]?.text()) ?? '';
    expect(text).toBe(guestsToCsv(importGuests(HINGLISH_CSV, 'expected').guests));
    expect(text).toContain(`"'=HYPERLINK`);
  });

  it('adds a party by hand and plans for the guests who have not declined', async () => {
    const user = userEvent.setup();
    const setup = renderList();
    await user.click(screen.getByRole('button', { name: 'Add to the list' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Add the guest’s or family’s name.');
    await user.type(screen.getByLabelText('Name or family'), 'Verma ji');
    await user.selectOptions(screen.getByLabelText('Adults'), '2');
    await user.selectOptions(screen.getByLabelText('Children'), '1');
    await user.selectOptions(screen.getByLabelText('RSVP'), 'confirmed');
    await user.click(screen.getByRole('button', { name: 'Add to the list' }));
    expect(screen.getByRole('rowheader', { name: 'Verma ji' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Plan for 3 guests/ }));
    expect(setup.onApplyPatch).toHaveBeenCalledWith({ ops: [{ op: 'setGuests', value: 3 }] });
  });

  it('recounts after an RSVP change and a removal, then clears', async () => {
    const user = userEvent.setup();
    renderList();
    await importCsv(HINGLISH_CSV);
    await user.selectOptions(await screen.findByLabelText('RSVP for Gupta parivar'), 'confirmed');
    const { guests } = importGuests(HINGLISH_CSV, 'expected');
    const regupta = guests.map((guest) =>
      guest.name === 'Gupta parivar' ? { ...guest, status: 'confirmed' as const } : guest,
    );
    expect(
      screen.getByText(new RegExp(`${countGuests(regupta).confirmed} confirmed`)),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove Sharma ji' }));
    expect(screen.queryByRole('rowheader', { name: 'Sharma ji' })).not.toBeInTheDocument();
    // The pressed button is gone: focus moves to the next row's, and the removal is spoken.
    const next = guests[guests.findIndex((guest) => guest.name === 'Sharma ji') + 1];
    if (next === undefined) throw new Error('the CSV has a row after Sharma ji');
    expect(screen.getByRole('button', { name: `Remove ${next.name}` })).toHaveFocus();
    expect(screen.getByText('Removed Sharma ji.')).toHaveAttribute('aria-live', 'polite');
    await user.click(screen.getByRole('button', { name: 'Clear the list' }));
    expect(screen.queryByRole('table', { name: 'Your guest list' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Name or family')).toHaveFocus();
    expect(screen.getByText(CLEARED)).toHaveAttribute('aria-live', 'polite');
  });

  it('keeps focus in the section when the last guest is removed', async () => {
    const user = userEvent.setup();
    renderList('bengaluru-birthday');
    await user.type(screen.getByLabelText('Name or family'), 'Iyer family');
    await user.click(screen.getByRole('button', { name: 'Add to the list' }));
    await user.click(screen.getByRole('button', { name: 'Remove Iyer family' }));
    expect(screen.getByLabelText('Name or family')).toHaveFocus();
    expect(screen.getByText('Removed Iyer family.')).toHaveAttribute('aria-live', 'polite');
  });
});
