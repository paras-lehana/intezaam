/**
 * The question box for Ask Intezaam, with starter questions.
 *
 * Responsibility: a labelled text area (English, Hindi or Hinglish; capped at the request
 * schema's length) where Enter sends and Shift+Enter starts a new line, a submit button that is
 * never disabled (aria-disabled while busy), an inline error, and example chips that ask straight
 * away (the Hindi one tagged `lang="hi"`).
 * Boundary: controlled by the tool; it only reports what the reader asked.
 */
import { type FormEvent, type KeyboardEvent, type ReactElement, useState } from 'react';
import { MAX_QUESTION_CHARS } from '@intezaam/core/schemas';
import { ASK_EXAMPLES } from './ask-copy';

export interface AskFormProps {
  readonly busy: boolean;
  readonly error: string;
  /** Resolves true when the question was answered (the box is then cleared). */
  readonly onAsk: (question: string) => Promise<boolean>;
}

export function AskForm({ busy, error, onAsk }: AskFormProps): ReactElement {
  const [question, setQuestion] = useState('');

  async function submit(text: string): Promise<void> {
    if (await onAsk(text)) setQuestion('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void submit(question);
  }

  /** Enter sends, as in a chat; Shift+Enter keeps a new line, and an IME composition is left alone. */
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <form className="ask-form" noValidate onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="ask-question">Your question — English, Hindi or Hinglish</label>
        <textarea
          id="ask-question"
          rows={2}
          value={question}
          maxLength={MAX_QUESTION_CHARS}
          placeholder="For example: Catering kitna hai? Or: add 50 guests"
          aria-invalid={error !== ''}
          aria-describedby={error === '' ? undefined : 'ask-error'}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <button type="submit" className="button button--cta" aria-disabled={busy} aria-busy={busy}>
        {busy ? 'Asking…' : 'Ask'}
      </button>
      {error === '' ? null : (
        <p id="ask-error" className="field__error" role="alert">
          {error}
        </p>
      )}
      <ul className="plain-list ask-examples" role="list" aria-label="Example questions">
        {ASK_EXAMPLES.map((example) => (
          <li key={example.text}>
            <button
              type="button"
              className="chip ask-examples__chip"
              lang={example.lang}
              onClick={() => void submit(example.text)}
            >
              {example.text}
            </button>
          </li>
        ))}
      </ul>
    </form>
  );
}
