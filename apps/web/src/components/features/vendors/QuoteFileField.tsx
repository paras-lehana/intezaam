/**
 * "Read a photo or PDF" for one quote: upload, read by the AI, and put the transcript in
 * the quote's text box to check and edit.
 *
 * Responsibility: a labelled native file input with a visible privacy note (the file goes to
 * the model as-is; only its transcript is redacted), a pre-check of type and size, the call
 * to the quote reader, and an announced outcome — the transcript fills the box (redacted by
 * the server), or the reason it could not, with "paste the text instead" when the AI is
 * unavailable. Boundary: the comparison itself stays text-only; nothing here ranks quotes.
 */
import { type ChangeEvent, type ReactElement, useState } from 'react';
import { readQuoteFile } from '../../../lib/api';
import { LiveRegion } from '../../ui/LiveRegion';
import { QUOTE_FILE_ACCEPT, prepareQuoteFile } from './quote-file';

export interface QuoteFileFieldProps {
  readonly inputId: string;
  readonly quoteName: string;
  readonly onText: (text: string) => void;
}

/** Shown before the file is chosen: a photo cannot be redacted before the model reads it. */
export const QUOTE_FILE_PRIVACY_NOTE =
  'Your photo or PDF goes to Google Gemini as-is to be read: crop out or cover phone numbers and bank details first.';

export function QuoteFileField({ inputId, quoteName, onText }: QuoteFileFieldProps): ReactElement {
  const [status, setStatus] = useState('');
  const noteId = `${inputId}-note`;

  async function read(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (file === undefined) return;
    // Cleared at once so choosing the same file again (after editing it) reads it again.
    input.value = '';
    setStatus(`Reading ${file.name}…`);
    const prepared = await prepareQuoteFile(file);
    if (!prepared.ok) {
      setStatus(prepared.error);
      return;
    }
    const result = await readQuoteFile(prepared.value);
    if (!result.ok) {
      setStatus(result.error.message);
      return;
    }
    onText(result.value.text);
    setStatus(`Read ${quoteName} from ${file.name}. Check the text, then compare.`);
  }

  return (
    <div className="quote-file">
      <label htmlFor={inputId} className="quote-file__label">
        Or read a photo or PDF of {quoteName}
      </label>
      <p id={noteId} className="quote-file__note">
        {QUOTE_FILE_PRIVACY_NOTE}
      </p>
      <input
        id={inputId}
        type="file"
        accept={QUOTE_FILE_ACCEPT}
        aria-describedby={noteId}
        className="quote-file__input"
        onChange={(event) => void read(event)}
      />
      <LiveRegion message={status} visible className="quote-file__status" />
    </div>
  );
}
