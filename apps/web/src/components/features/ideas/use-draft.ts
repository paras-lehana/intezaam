/**
 * State for the message studio: one draft request at a time, its result or its error.
 *
 * Responsibility: call `fetchDraft` (the only network step on this tab), ignore a second
 * press while one is in flight, keep the last good draft, and cancel a pending request when
 * the tab unmounts. Boundary: the server builds the draft from the plan it recomputes; this
 * hook never sends guest names or the guest list.
 */
import { useEffect, useRef, useState } from 'react';
import type { DraftRequest, DraftResponse } from '@intezaam/core/schemas';
import { fetchDraft } from '../../../lib/api';

export interface DraftState {
  readonly draft: DraftResponse | undefined;
  readonly busy: boolean;
  readonly error: string;
  readonly request: (req: DraftRequest) => Promise<void>;
}

/**
 * The message studio's request state.
 * @example
 * const studio = useDraft();
 * await studio.request({ context, todayIso, kind: 'invitation', language: 'hi', tone: 'warm' });
 */
export function useDraft(): DraftState {
  const [draft, setDraft] = useState<DraftResponse | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  async function request(req: DraftRequest): Promise<void> {
    if (controller.current !== null) return;
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    setError('');
    const result = await fetchDraft(req, current.signal);
    controller.current = null;
    if (current.signal.aborted) return;
    setBusy(false);
    if (result.ok) setDraft(result.value);
    else setError(result.error.message);
  }

  return { draft, busy, error, request };
}
