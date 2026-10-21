/**
 * Responsibility: usePlanState — a submit shows the engine's plan at once (before any reply),
 * narration goes loading → ready, or offline when the server cannot be reached; a late
 * reply for an older plan is ignored; a `#plan=` link opens its plan on arrival; typed
 * changes re-plan or report why not; "continue" restores the last context.
 * Boundary: fetch is stubbed with controllable replies; plans come from the engine.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { encodeContextForUrl } from '@intezaam/core/export';
import { PATCH_FAILED_MESSAGE, PLAN_FRAGMENT_PREFIX, storeLastContext } from '../../lib/plan-state';
import { usePlanState } from '../../lib/use-plan-state';
import { narrationFor, narrationResponseFor, samplePlan } from '../features/plan-fixtures';
import { TEST_TODAY_ISO, jsonResponse } from '../helpers';

const wedding = samplePlan('jaipur-wedding');
const birthday = samplePlan('bengaluru-birthday');

/** A fetch whose replies the test releases one at a time. */
function deferredFetch(): { release: (index: number, response: Response) => void } {
  const pending: ((response: Response) => void)[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(
      () =>
        new Promise<Response>((resolve) => {
          pending.push(resolve);
        }),
    ),
  );
  return { release: (index, response) => pending[index]?.(response) };
}

afterEach(() => {
  window.history.replaceState(null, '', '#');
});

describe('usePlanState', () => {
  it('shows the local plan at once and fills the narration when it arrives', async () => {
    const replies = deferredFetch();
    const { result } = renderHook(() => usePlanState(TEST_TODAY_ISO));
    expect(result.current.state.narrationState).toBe('idle');
    act(() => {
      result.current.submit(wedding.context);
    });
    expect(result.current.state.plan).toEqual(wedding.plan);
    expect(result.current.state.narrationState).toBe('loading');
    replies.release(0, jsonResponse(narrationResponseFor(wedding.plan)));
    await waitFor(() => expect(result.current.state.narrationState).toBe('ready'));
    expect(result.current.state.narration).toEqual(narrationFor(wedding.plan));
  });

  it('falls back to the offline planner when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline')));
    const { result } = renderHook(() => usePlanState(TEST_TODAY_ISO));
    act(() => {
      result.current.submit(birthday.context);
    });
    await waitFor(() => expect(result.current.state.narrationState).toBe('offline'));
    expect(result.current.state.plan).toEqual(birthday.plan);
    expect(result.current.state.narration).toBeUndefined();
  });

  it('ignores a late narration for an older plan', async () => {
    const replies = deferredFetch();
    const { result } = renderHook(() => usePlanState(TEST_TODAY_ISO));
    act(() => {
      result.current.submit(wedding.context);
    });
    act(() => {
      result.current.submit(birthday.context);
    });
    replies.release(0, jsonResponse(narrationResponseFor(wedding.plan)));
    replies.release(1, jsonResponse(narrationResponseFor(birthday.plan)));
    await waitFor(() => expect(result.current.state.narrationState).toBe('ready'));
    expect(result.current.state.plan).toEqual(birthday.plan);
    expect(result.current.state.narration).toEqual(narrationFor(birthday.plan));
  });

  it('opens a shared #plan= link on arrival', async () => {
    deferredFetch();
    window.history.replaceState(
      null,
      '',
      `#${PLAN_FRAGMENT_PREFIX}${encodeContextForUrl(birthday.context)}`,
    );
    const { result } = renderHook(() => usePlanState(TEST_TODAY_ISO));
    expect(result.current.state.origin).toBe('link');
    expect(result.current.state.context).toEqual(birthday.context);
    expect(result.current.state.plan).toEqual(birthday.plan);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  });

  it('re-plans after a typed change, and explains a change it cannot make', () => {
    deferredFetch();
    const { result } = renderHook(() => usePlanState(TEST_TODAY_ISO));
    act(() => {
      result.current.submit(birthday.context);
    });
    const guests = birthday.context.guests + 5;
    let changed: unknown;
    act(() => {
      changed = result.current.applyPatch({ ops: [{ op: 'setGuests', value: guests }] });
    });
    expect(result.current.state.context?.guests).toBe(guests);
    expect(changed).toEqual(result.current.state.context);
    expect(result.current.state.origin).toBe('patch');
    act(() => {
      result.current.applyPatch({ ops: [{ op: 'setGuests', value: 999_999 }] });
    });
    expect(result.current.state.error).toBe(PATCH_FAILED_MESSAGE);
    expect(result.current.state.context?.guests).toBe(guests);
  });

  it('offers and restores the last context from this device', () => {
    deferredFetch();
    storeLastContext(wedding.context);
    const { result } = renderHook(() => usePlanState(TEST_TODAY_ISO));
    expect(result.current.state.plan).toBeUndefined();
    expect(result.current.lastContext).toEqual(wedding.context);
    act(() => {
      result.current.restoreLast();
    });
    expect(result.current.state.origin).toBe('restore');
    expect(result.current.state.plan).toEqual(wedding.plan);
  });
});
