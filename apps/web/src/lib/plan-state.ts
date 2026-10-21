/**
 * Plan state helpers: today in the browser, the share-link fragment, the remembered last
 * context, typed changes and the words the page announces.
 *
 * Responsibility: the pure (or storage-guarded) steps the plan hook composes — read a
 * `#plan=` link with core's validated codec, remember and recall the last context on this
 * device, apply a typed change through the same engine the server uses, and describe a new
 * plan for the live region. Boundary: no React and no network; `use-plan-state.ts` owns
 * state and the narration request.
 */
import type { Result } from '@intezaam/core';
import { applyPatch } from '@intezaam/core/engine';
import { decodeContextFromUrl, encodeContextForUrl } from '@intezaam/core/export';
import {
  type ContextPatch,
  type EventContext,
  type Plan,
  eventContextSchema,
} from '@intezaam/core/schemas';
import { toIsoDay } from './format';
import { readPreference, storePreference } from './preferences';

/** Where the last planned context is remembered on this device (versioned by core's codec). */
export const LAST_CONTEXT_STORAGE_KEY = 'intezaam:last-context';

/** A share link carries the whole context after `#plan=` (no server storage). */
export const PLAN_FRAGMENT_PREFIX = 'plan=';

/** The plan's heading: focus moves here after a plan is built (synthesis §7.4). */
export const PLAN_HEADING_ID = 'plan-heading';

/** What last changed the plan: the form, a typed change, a share link or "continue". */
export type PlanOrigin = 'submit' | 'patch' | 'link' | 'restore';

export const PATCH_FAILED_MESSAGE =
  'That change does not fit the plan’s limits, so nothing was changed.';

/**
 * Today's date in the reader's own time zone; the engine is pure and takes it as input.
 * @example
 * browserToday(); // '2026-10-20' on 20 October
 */
export function browserToday(): string {
  return toIsoDay(new Date());
}

/**
 * The context a `#plan=` link carries; undefined when the hash is not a plan link at all.
 * @example
 * contextFromFragment('#money'); // undefined
 * contextFromFragment('#plan=v1.e30')?.ok; // false — not a valid context
 */
export function contextFromFragment(hash: string): Result<EventContext> | undefined {
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!fragment.startsWith(PLAN_FRAGMENT_PREFIX)) return undefined;
  return decodeContextFromUrl(fragment.slice(PLAN_FRAGMENT_PREFIX.length));
}

/**
 * Remembers the context on this device; a blocked store simply means no "Continue" later.
 * @example
 * storeLastContext(context);
 */
export function storeLastContext(context: EventContext): void {
  storePreference(LAST_CONTEXT_STORAGE_KEY, encodeContextForUrl(context));
}

/**
 * The remembered context, re-validated (storage is untrusted input); undefined when absent.
 * @example
 * readLastContext(); // the context planned on the last visit, or undefined
 */
export function readLastContext(): EventContext | undefined {
  const stored = readPreference(LAST_CONTEXT_STORAGE_KEY);
  if (stored === null) return undefined;
  const decoded = decodeContextFromUrl(stored);
  return decoded.ok ? decoded.value : undefined;
}

/**
 * Applies a typed change (a lever, a what-if, an Ask proposal) and re-validates the result
 * with the full context schema, so a change can never produce an invalid plan input.
 * @example
 * patchContext(context, { ops: [{ op: 'setGuests', value: 250 }] }); // { ok: true, value: … }
 */
export function patchContext(
  context: EventContext,
  patch: ContextPatch,
): Result<EventContext, string> {
  const parsed = eventContextSchema.safeParse(applyPatch(context, patch));
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, error: PATCH_FAILED_MESSAGE };
}

/** The readiness score is a 0–100 scale (core readinessSchema). */
const READINESS_MAX = 100;

const ORIGIN_WORDS: Readonly<Record<PlanOrigin, string>> = {
  submit: 'Plan ready',
  patch: 'Plan updated',
  link: 'Shared plan opened',
  restore: 'Your last plan is back',
};

/**
 * One sentence for the live region after a plan is built or rebuilt.
 * @example
 * planAnnouncement(plan, 'submit'); // 'Plan ready: Balanced budget · On track timeline. Readiness 50 out of 100.'
 */
export function planAnnouncement(plan: Plan, origin: PlanOrigin): string {
  return `${ORIGIN_WORDS[origin]}: ${plan.verdict.headline}. Readiness ${plan.readiness.score} out of ${READINESS_MAX}.`;
}
