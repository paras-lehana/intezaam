/**
 * Responsibility: useAnnouncement — the live-region text is empty right after a new key and
 * returns after the pause, so a repeated sentence for a new plan version is spoken again;
 * the same key keeps its text. Boundary: fake timers drive the pause; no LiveRegion markup.
 */
import { type RenderHookResult, act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ANNOUNCE_DELAY_MS, useAnnouncement } from '../../lib/use-announcement';

const MESSAGE = 'Plan updated: Balanced budget. Readiness 50 out of 100.';

interface Props {
  readonly message: string;
  readonly version: number;
}

function renderAnnouncement(initial: Props): RenderHookResult<string, Props> {
  return renderHook(({ message, version }: Props) => useAnnouncement(message, version), {
    initialProps: initial,
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAnnouncement', () => {
  it('starts empty and fills the region after the pause', () => {
    const { result } = renderAnnouncement({ message: MESSAGE, version: 1 });
    expect(result.current).toBe('');
    act(() => {
      vi.advanceTimersByTime(ANNOUNCE_DELAY_MS);
    });
    expect(result.current).toBe(MESSAGE);
  });

  it('clears and re-sets the same words for a new version, so they are spoken again', () => {
    const { result, rerender } = renderAnnouncement({ message: MESSAGE, version: 1 });
    act(() => {
      vi.advanceTimersByTime(ANNOUNCE_DELAY_MS);
    });
    rerender({ message: MESSAGE, version: 2 });
    expect(result.current).toBe('');
    act(() => {
      vi.advanceTimersByTime(ANNOUNCE_DELAY_MS);
    });
    expect(result.current).toBe(MESSAGE);
  });

  it('keeps the text while the version stays the same', () => {
    const { result, rerender } = renderAnnouncement({ message: MESSAGE, version: 1 });
    act(() => {
      vi.advanceTimersByTime(ANNOUNCE_DELAY_MS);
    });
    rerender({ message: MESSAGE, version: 1 });
    expect(result.current).toBe(MESSAGE);
  });
});
