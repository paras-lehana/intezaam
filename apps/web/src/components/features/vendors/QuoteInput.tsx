/**
 * One quote's box: paste the vendor's text, or read it from a photo or PDF.
 *
 * Responsibility: a labelled text area with a character limit (the server's
 * MAX_QUOTE_CHARS) and the file reader underneath, which puts its transcript in the same
 * box for the reader to check and edit before comparing. Boundary: controlled; the quote
 * reader owns the text.
 */
import type { ReactElement } from 'react';
import { MAX_QUOTE_CHARS } from '@intezaam/core/schemas';
import { QuoteFileField } from './QuoteFileField';

export interface QuoteInputProps {
  readonly id: string;
  readonly name: string;
  readonly text: string;
  readonly onChange: (text: string) => void;
}

/** Five lines show a typical WhatsApp quote without scrolling on a phone. */
const QUOTE_ROWS = 5;

export function QuoteInput({ id, name, text, onChange }: QuoteInputProps): ReactElement {
  return (
    <div className="quote-input">
      <label htmlFor={id} className="quote-input__label">
        {name}: paste the vendor’s message or quote
      </label>
      <textarea
        id={id}
        rows={QUOTE_ROWS}
        maxLength={MAX_QUOTE_CHARS}
        value={text}
        onChange={(event) => onChange(event.target.value)}
      />
      <QuoteFileField inputId={`${id}-file`} quoteName={name} onText={onChange} />
    </div>
  );
}
