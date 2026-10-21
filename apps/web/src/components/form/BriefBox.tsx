/**
 * The free-text brief: "Describe it in your words — English, Hindi or Hinglish".
 *
 * Responsibility: an empty text box, a character counter and the "Read my brief" button,
 * which hands the text to the page (the page calls the brief reader and fills the form).
 * Boundary: no network here. The button is never disabled while busy (aria-disabled plus a
 * guard), so keyboard focus is never lost; a too-short brief gets an inline error.
 */
import { type ReactElement, useId, useRef, useState } from 'react';
import { MAX_BRIEF_CHARS, MIN_BRIEF_CHARS } from '@intezaam/core/schemas';
import { LiveRegion } from '../ui/LiveRegion';
import { FieldShell } from './FieldShell';
import { BRIEF_INPUT_ID } from './focus-field';

export interface BriefBoxProps {
  readonly onReadBrief: (text: string) => void;
  readonly busy: boolean;
  /** What the page says after reading (e.g. "Filled city, guests and budget"). */
  readonly status: string;
}

export const BRIEF_LABEL = 'Describe it in your words — English, Hindi or Hinglish';
export const BRIEF_BUTTON = 'Read my brief';
export const BRIEF_TOO_SHORT = 'Write a few words about your celebration first.';

/** Three lines show a typical one-sentence brief without scrolling on a 390 px phone. */
const BRIEF_ROWS = 3;

export function BriefBox({ onReadBrief, busy, status }: BriefBoxProps): ReactElement {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const counterId = useId();

  function read(): void {
    if (busy) return;
    const brief = text.trim();
    if (brief.length < MIN_BRIEF_CHARS) {
      setError(BRIEF_TOO_SHORT);
      inputRef.current?.focus();
      return;
    }
    setError(undefined);
    onReadBrief(brief);
  }

  return (
    <div className="brief panel-soft">
      <FieldShell
        inputId={BRIEF_INPUT_ID}
        label={BRIEF_LABEL}
        hint="For example: “Shaadi in Jaipur, 2 lakh mein 200 log, Diwali ke baad.” You can check every field before planning."
        error={error}
        renderControl={(a11y) => (
          <>
            <textarea
              {...a11y}
              ref={inputRef}
              rows={BRIEF_ROWS}
              maxLength={MAX_BRIEF_CHARS}
              value={text}
              aria-describedby={[a11y['aria-describedby'], counterId].filter(Boolean).join(' ')}
              onChange={(event) => setText(event.target.value)}
            />
            <p id={counterId} className="field__hint field__counter">
              {text.length} / {MAX_BRIEF_CHARS} characters
            </p>
          </>
        )}
      />
      <div className="brief__actions">
        <button
          type="button"
          className="button button--secondary"
          aria-disabled={busy}
          onClick={read}
        >
          {busy ? 'Reading your brief…' : BRIEF_BUTTON}
        </button>
        <LiveRegion message={status} visible className="brief__status" />
      </div>
    </div>
  );
}
