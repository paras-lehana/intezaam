/**
 * "Explain this change": an optional plain-language explanation of a what-if.
 *
 * Responsibility: on request only (the what-if itself never calls a model), ask the
 * planner to explain the change against the current plan, and show the answer with its
 * provenance badge (Gemini or the offline planner) and a `lang` for the language it is
 * written in. Boundary: one request at a time, and a
 * pending one is cancelled when the change it explains is replaced (the tool remounts this
 * per change); the server recomputes the plan from the context and answers only from it.
 */
import { type ReactElement, useEffect, useRef, useState } from 'react';
import type { AskResponse, ContextPatch, EventContext } from '@intezaam/core/schemas';
import { askPlanner } from '../../../lib/api';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { writtenLang } from '../common/written-language';
import { explainQuestion } from './describe-patch';

export interface ExplainChangeProps {
  readonly context: EventContext;
  readonly todayIso: string;
  readonly patch: ContextPatch;
}

export function ExplainChange({ context, todayIso, patch }: ExplainChangeProps): ReactElement {
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<AskResponse | undefined>(undefined);
  const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);

  useEffect(() => () => pending.current?.abort(), []);

  async function explain(): Promise<void> {
    if (pending.current !== null) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError('');
    const question = explainQuestion(patch);
    const result = await askPlanner(
      { context, todayIso, question, history: [] },
      controller.signal,
    );
    pending.current = null;
    if (controller.signal.aborted) return;
    setBusy(false);
    if (result.ok) setAnswer(result.value);
    else setError(result.error.message);
  }

  return (
    <div className="whatif-explain">
      <button
        type="button"
        className="button button--secondary"
        aria-disabled={busy}
        aria-busy={busy}
        onClick={() => void explain()}
      >
        {busy ? 'Explaining…' : 'Explain this change'}
      </button>
      {error === '' ? null : (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
      <div aria-live="polite">
        {answer === undefined ? null : (
          <>
            <p lang={writtenLang(answer.provenance, context.language)}>{answer.answer}</p>
            <ProvenanceBadge state="ready" provenance={answer.provenance} />
          </>
        )}
      </div>
    </div>
  );
}
