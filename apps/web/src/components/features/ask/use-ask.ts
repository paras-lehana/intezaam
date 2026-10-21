/**
 * State for Ask Intezaam: the conversation, one question in flight, and errors.
 *
 * Responsibility: send a question with the last few turns as history (the request schema's
 * cap) to `askPlanner`, append the validated answer, ignore a second press while one is in
 * flight, and cancel a pending request when the tool unmounts. Boundary: the server
 * recomputes the plan from the context and answers only from it; a proposed change in an
 * answer is never applied here.
 */
import { useEffect, useRef, useState } from 'react';
import {
  type AskResponse,
  type ChatTurn,
  type EventContext,
  MAX_HISTORY_TURNS,
  MIN_QUESTION_CHARS,
} from '@intezaam/core/schemas';
import { askPlanner } from '../../../lib/api';

export interface AskTurn {
  readonly id: number;
  readonly question: string;
  readonly response: AskResponse;
}

export interface AskState {
  readonly turns: readonly AskTurn[];
  readonly busy: boolean;
  readonly error: string;
  /** Resolves true when an answer arrived. */
  readonly ask: (question: string) => Promise<boolean>;
}

export const EMPTY_QUESTION = 'Type a question first.';

/**
 * The last turns as request history (oldest first), within the schema's cap.
 * @example
 * historyOf(turns).length <= MAX_HISTORY_TURNS; // true
 */
export function historyOf(turns: readonly AskTurn[]): ChatTurn[] {
  return turns.slice(-MAX_HISTORY_TURNS).map((turn) => ({
    question: turn.question,
    answer: turn.response.answer,
  }));
}

/**
 * Ask Intezaam's conversation state for one plan.
 * @example
 * const chat = useAsk(context, '2026-10-20');
 * await chat.ask('Catering kitna hai?');
 */
export function useAsk(context: EventContext, todayIso: string): AskState {
  const [turns, setTurns] = useState<readonly AskTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);

  useEffect(() => () => pending.current?.abort(), []);

  async function ask(text: string): Promise<boolean> {
    const question = text.trim();
    if (pending.current !== null) return false;
    if (question.length < MIN_QUESTION_CHARS) {
      setError(EMPTY_QUESTION);
      return false;
    }
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError('');
    const result = await askPlanner(
      { context, todayIso, question, history: historyOf(turns) },
      controller.signal,
    );
    pending.current = null;
    if (controller.signal.aborted) return false;
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return false;
    }
    setTurns((current) => [
      ...current,
      { id: current.length + 1, question, response: result.value },
    ]);
    return true;
  }

  return { turns, busy, error, ask };
}
