/**
 * Who wrote a piece of text: Gemini (with model and seconds) or the offline planner.
 *
 * Responsibility: honest provenance on every AI output (feature #40) — the badge
 * names the model and how long it took (or "saved answer" when the server's cache served
 * it), says "Offline planner" whenever the server's
 * offline twin answered (with why, when the server says: today's free quota is spent, the
 * model did not answer, or no model is set up) or the server could not be reached, and
 * says so while it waits. Boundary: display only; the server fills the provenance object.
 */
import type { ReactElement } from 'react';
import { CACHE_ENGINE, type OfflineReason, type Provenance } from '@intezaam/core/schemas';
import { formatSeconds } from '../../../lib/format';
import type { NarrationState } from '../panel-props';

export interface ProvenanceBadgeProps {
  readonly state: NarrationState;
  readonly provenance?: Provenance | undefined;
}

export const OFFLINE_PLANNER = 'Offline planner';
export const ASKING_GEMINI = 'Asking Gemini to explain…';
export const SAVED_ANSWER = 'saved answer';

/** Why the offline planner answered, in the reader's words (core OFFLINE_REASONS). */
export const OFFLINE_REASON_TEXT: Readonly<Record<OfflineReason, string>> = {
  daily_quota: 'today’s free AI quota is used up',
  upstream_error: 'the AI model did not answer',
  not_configured: 'AI is not set up on this server',
};

function geminiOrOffline(provenance: Provenance | undefined): string {
  if (provenance === undefined) return OFFLINE_PLANNER;
  if (provenance.mode === 'offline') {
    const reason = provenance.reason;
    return reason === undefined
      ? OFFLINE_PLANNER
      : `${OFFLINE_PLANNER} · ${OFFLINE_REASON_TEXT[reason]}`;
  }
  // A cached answer took no model time now: say it was saved rather than "0 s".
  const cached = provenance.steps.some((step) => step.engine === CACHE_ENGINE);
  const timing = cached ? SAVED_ANSWER : formatSeconds(provenance.latencyMs);
  const parts = ['Explained by Gemini', provenance.models[0], timing];
  return parts.filter((part): part is string => part !== undefined).join(' · ');
}

/** The badge text for every narration state (a closed table, so a new state needs words). */
const STATE_TEXT: Readonly<Record<NarrationState, (provenance?: Provenance) => string>> = {
  idle: () => OFFLINE_PLANNER,
  loading: () => ASKING_GEMINI,
  ready: geminiOrOffline,
  offline: () => OFFLINE_PLANNER,
};

/**
 * The badge text, exported so tests derive expectations from the same rule.
 * @example
 * provenanceText('ready', { mode: 'gemini', models: ['gemini-3.5-flash-lite'], latencyMs: 900, steps: [] });
 * // 'Explained by Gemini · gemini-3.5-flash-lite · 0.9 s'
 * provenanceText('ready', { mode: 'offline', reason: 'daily_quota', models: [], latencyMs: 4, steps: [] });
 * // 'Offline planner · today’s free AI quota is used up'
 */
export function provenanceText(state: NarrationState, provenance?: Provenance): string {
  return STATE_TEXT[state](provenance);
}

export function ProvenanceBadge({ state, provenance }: ProvenanceBadgeProps): ReactElement {
  const gemini = state === 'ready' && provenance?.mode === 'gemini';
  return (
    <p className={`chip provenance provenance--${gemini ? 'gemini' : state}`}>
      <span className="provenance__mark" aria-hidden="true">
        {gemini ? '✦' : '⚙'}
      </span>{' '}
      <span>{provenanceText(state, provenance)}</span>
    </p>
  );
}
