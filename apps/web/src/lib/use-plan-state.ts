/**
 * The plan page's state: the context, the plan computed in the browser, and its narration.
 *
 * Responsibility: build the plan LOCALLY with core `buildPlan` — instant, no network, the
 * same engine the server runs — then ask /api/plan/narration for the AI narration alone
 * (idle → loading → ready, or offline when the server cannot be reached). A newer plan
 * cancels the older request, and a late reply for an older plan is ignored. The last
 * context is remembered on this device; a `#plan=` share link is opened on arrival. Every
 * new plan version yields a live-region sentence naming what changed, re-announced even
 * when the words repeat. Boundary: no markup; the page composes this with the form and
 * the workspace.
 */
import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';
import type { Result } from '@intezaam/core';
import { buildPlan } from '@intezaam/core/engine';
import type {
  ContextPatch,
  EventContext,
  Narration,
  Plan,
  Provenance,
} from '@intezaam/core/schemas';
import type { NarrationState } from '../components/features/panel-props';
import { describePatch } from '../components/features/what-if/describe-patch';
import { fetchNarration } from './api';
import {
  type PlanOrigin,
  contextFromFragment,
  patchContext,
  planAnnouncement,
  readLastContext,
  storeLastContext,
} from './plan-state';
import { useAnnouncement } from './use-announcement';

export interface PlanState {
  readonly context?: EventContext | undefined;
  readonly plan?: Plan | undefined;
  /** Why the last attempt to plan or change the plan did not apply. */
  readonly error?: string | undefined;
  readonly narration?: Narration | undefined;
  readonly provenance?: Provenance | undefined;
  readonly narrationState: NarrationState;
  /** Bumps with every new plan; narration is accepted only for the version it was asked for. */
  readonly version: number;
  readonly origin: PlanOrigin;
  /** What the typed change that made this plan did, in words (empty for a whole new plan). */
  readonly change: readonly string[];
}

export interface PlanStateApi {
  readonly state: PlanState;
  /** The context planned on an earlier visit, offered as "Continue your last plan". */
  readonly lastContext: EventContext | undefined;
  readonly submit: (context: EventContext) => boolean;
  /** Applies a typed change; returns the new context so the form can show it. */
  readonly applyPatch: (patch: ContextPatch) => EventContext | undefined;
  readonly restoreLast: () => EventContext | undefined;
  /** The live-region text: what changed and the new verdict, spoken for every plan version. */
  readonly announcement: string;
}

const EMPTY_STATE: PlanState = {
  narrationState: 'idle',
  version: 0,
  origin: 'submit',
  change: [],
};

type SetPlanState = Dispatch<SetStateAction<PlanState>>;

/** The state for a freshly built plan, or why it could not be built. */
function plannedState(
  context: EventContext,
  todayIso: string,
  version: number,
  origin: PlanOrigin,
  change: readonly string[] = [],
): Result<PlanState, string> {
  const built = buildPlan(context, todayIso);
  return built.ok
    ? {
        ok: true,
        value: { context, plan: built.value, narrationState: 'loading', version, origin, change },
      }
    : { ok: false, error: built.error.message };
}

/** A `#plan=` link opens its plan at once; any other arrival starts with an empty workspace. */
function arrivalState(todayIso: string): PlanState {
  const link = contextFromFragment(window.location.hash);
  if (link === undefined) return EMPTY_STATE;
  if (!link.ok) return { ...EMPTY_STATE, error: link.error.message };
  const state = plannedState(link.value, todayIso, EMPTY_STATE.version + 1, 'link');
  return state.ok ? state.value : { ...EMPTY_STATE, error: state.error };
}

/** Asks the server to narrate one plan version; the reply lands only on that version. */
function requestNarration(
  context: EventContext,
  todayIso: string,
  version: number,
  setState: SetPlanState,
  signal: AbortSignal,
): void {
  void fetchNarration({ context, todayIso }, signal).then((result) => {
    if (signal.aborted) return;
    setState((current) => {
      if (current.version !== version) return current;
      return result.ok
        ? {
            ...current,
            narration: result.value.narration,
            provenance: result.value.provenance,
            narrationState: 'ready',
          }
        : { ...current, narration: undefined, provenance: undefined, narrationState: 'offline' };
    });
  });
}

/**
 * Plan state for the plan page.
 * @example
 * const planner = usePlanState('2026-10-20');
 * planner.submit(context); // the plan shows at once; narration follows
 */
export function usePlanState(todayIso: string): PlanStateApi {
  const [state, setState] = useState<PlanState>(() => arrivalState(todayIso));
  const [lastContext] = useState(readLastContext);
  const { context, version, narrationState } = state;
  const announcement = useAnnouncement(
    state.plan === undefined ? '' : planAnnouncement(state.plan, state.origin, state.change),
    version,
  );

  // Efficiency: one narration request per plan version; a newer version's cleanup aborts it.
  useEffect(() => {
    if (narrationState !== 'loading' || context === undefined) return undefined;
    const controller = new AbortController();
    requestNarration(context, todayIso, version, setState, controller.signal);
    return () => controller.abort();
  }, [context, version, narrationState, todayIso]);

  useEffect(() => {
    if (context !== undefined) storeLastContext(context);
  }, [context]);

  function plan(next: EventContext, origin: PlanOrigin, change?: readonly string[]): boolean {
    const built = plannedState(next, todayIso, state.version + 1, origin, change);
    if (!built.ok) {
      setState((current) => ({ ...current, error: built.error }));
      return false;
    }
    setState(built.value);
    return true;
  }

  function applyPatch(patch: ContextPatch): EventContext | undefined {
    if (context === undefined) return undefined;
    const patched = patchContext(context, patch);
    if (!patched.ok) {
      setState((current) => ({ ...current, error: patched.error }));
      return undefined;
    }
    return plan(patched.value, 'patch', describePatch(patch)) ? patched.value : undefined;
  }

  function restoreLast(): EventContext | undefined {
    if (lastContext === undefined) return undefined;
    return plan(lastContext, 'restore') ? lastContext : undefined;
  }

  return {
    state,
    lastContext,
    submit: (next) => plan(next, 'submit'),
    applyPatch,
    restoreLast,
    announcement,
  };
}
