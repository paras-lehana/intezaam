/**
 * Responsibility: the plan-state helpers — a `#plan=` fragment decodes to the exact context
 * (anything else is not a plan link, a broken link is an error), the last context survives
 * storage and garbage in storage is ignored, a typed change re-validates, and the live
 * announcement reads from the plan. Boundary: pure helpers; contexts come from the samples.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyPatch } from '@intezaam/core/engine';
import { encodeContextForUrl } from '@intezaam/core/export';
import type { ContextPatch } from '@intezaam/core/schemas';
import {
  LAST_CONTEXT_STORAGE_KEY,
  PATCH_FAILED_MESSAGE,
  PLAN_FRAGMENT_PREFIX,
  browserToday,
  contextFromFragment,
  patchContext,
  planAnnouncement,
  readLastContext,
  storeLastContext,
} from '../../lib/plan-state';
import { samplePlan } from '../features/plan-fixtures';
import { TEST_TODAY_ISO } from '../helpers';

const { context, plan } = samplePlan('bengaluru-birthday');

/** More guests than the context schema allows (MAX_GUESTS is 5,000). */
const TOO_MANY_GUESTS = 999_999;

afterEach(() => {
  vi.useRealTimers();
});

describe('contextFromFragment', () => {
  it('decodes a share link to the same context', () => {
    const hash = `#${PLAN_FRAGMENT_PREFIX}${encodeContextForUrl(context)}`;
    expect(contextFromFragment(hash)).toEqual({ ok: true, value: context });
  });

  it('ignores hashes that are tab anchors, not plan links', () => {
    expect(contextFromFragment('#money')).toBeUndefined();
    expect(contextFromFragment('')).toBeUndefined();
  });

  it('reports a broken plan link as an error', () => {
    expect(contextFromFragment(`#${PLAN_FRAGMENT_PREFIX}v1.not-a-context`)?.ok).toBe(false);
  });
});

describe('last context on this device', () => {
  it('round-trips through storage', () => {
    storeLastContext(context);
    expect(readLastContext()).toEqual(context);
  });

  it('is absent on a first visit and ignores tampered storage', () => {
    expect(readLastContext()).toBeUndefined();
    window.localStorage.setItem(LAST_CONTEXT_STORAGE_KEY, 'v1.e30');
    expect(readLastContext()).toBeUndefined();
  });
});

describe('patchContext', () => {
  it('applies a typed change exactly as the engine does', () => {
    const patch: ContextPatch = { ops: [{ op: 'setGuests', value: context.guests + 10 }] };
    expect(patchContext(context, patch)).toEqual({ ok: true, value: applyPatch(context, patch) });
  });

  it('refuses a change that breaks the context limits', () => {
    const patch: ContextPatch = { ops: [{ op: 'setGuests', value: TOO_MANY_GUESTS }] };
    expect(patchContext(context, patch)).toEqual({ ok: false, error: PATCH_FAILED_MESSAGE });
  });
});

describe('words and dates', () => {
  it('announces the verdict headline and readiness', () => {
    const text = planAnnouncement(plan, 'submit');
    expect(text).toContain(plan.verdict.headline);
    expect(text).toContain(String(plan.readiness.score));
    expect(planAnnouncement(plan, 'patch')).toMatch(/^Plan updated/);
  });

  it('names what a typed change did, so a repeat verdict still says what moved', () => {
    const change = ['Guests: 250', 'Leave out decor'];
    const text = planAnnouncement(plan, 'patch', change);
    expect(text.startsWith(`Plan updated (${change.join('; ')}): `)).toBe(true);
    expect(text).not.toBe(planAnnouncement(plan, 'patch'));
  });

  it('reads today from the browser clock as a local ISO day', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TEST_TODAY_ISO}T10:00:00`));
    expect(browserToday()).toBe(TEST_TODAY_ISO);
  });
});
