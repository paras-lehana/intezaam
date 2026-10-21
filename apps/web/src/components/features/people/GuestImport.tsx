/**
 * Imports guests from a CSV: a spreadsheet, or a Google Contacts export.
 *
 * Responsibility: a labelled file picker that reads the file IN the browser, refuses files
 * that are too large, maps the columns (English, Hindi and Hinglish headers; Google's
 * First/Last Name) and says how many parties and people came in. Boundary: the file is
 * read locally and never uploaded; phone numbers and e-mails in it are ignored.
 */
import { type ChangeEvent, type ReactElement, useState } from 'react';
import { type PickRefusal, readPickedText } from '../../../lib/read-picked-text';
import { MAX_IMPORT_BYTES, importGuests } from './guest-csv';
import type { Guest } from './guest-rules';

export interface GuestImportProps {
  readonly nextBatch: () => string;
  readonly onImport: (guests: readonly Guest[]) => void;
}

export const TOO_LARGE =
  'That file is too large for a guest list. Export only the guests and try again.';
export const UNREADABLE =
  'That file could not be read. Save it in CSV format (comma-separated) and try again.';

const REFUSAL_MESSAGES: Readonly<Record<PickRefusal, string>> = {
  'too-large': TOO_LARGE,
  unreadable: UNREADABLE,
};

export function GuestImport({ nextBatch, onImport }: GuestImportProps): ReactElement {
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  async function handleFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const picked = await readPickedText(event.currentTarget, MAX_IMPORT_BYTES);
    if (picked.kind === 'none') return;
    if (picked.kind !== 'text') {
      setFailed(true);
      setMessage(REFUSAL_MESSAGES[picked.kind]);
      return;
    }
    const { guests, skipped } = importGuests(picked.text, nextBatch());
    const people = guests.reduce((sum, guest) => sum + guest.adults + guest.kids, 0);
    onImport(guests);
    setFailed(false);
    setMessage(
      `Added ${guests.length} parties (${people} people)` +
        (skipped > 0 ? `; ${skipped} rows without a name were skipped.` : '.'),
    );
  }

  return (
    <div className="field guest-import">
      <label htmlFor="guest-import">Import a CSV (a spreadsheet or Google Contacts)</label>
      <input
        id="guest-import"
        type="file"
        accept=".csv,text/csv,text/plain"
        aria-describedby="guest-import-hint"
        onChange={(event) => void handleFile(event)}
      />
      <p id="guest-import-hint" className="field__hint">
        Columns like Name / Naam, Adults, Kids / Bachche, Diet / Khana, RSVP and Side are understood
        — “haan”, “NV”, “ladkiwale” too. Phone numbers are not read.
      </p>
      <p className={failed ? 'field__error' : 'muted'} role={failed ? 'alert' : 'status'}>
        {message}
      </p>
    </div>
  );
}
