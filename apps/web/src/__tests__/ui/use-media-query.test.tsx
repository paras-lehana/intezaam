/**
 * Responsibility: the media-query hook reports the mobile-first, motion-free default where
 * matchMedia is missing and in a server render, follows a query's change events while mounted
 * and stops listening on unmount; the reduced-motion check reads the system preference. Boundary: matchMedia
 * is stubbed per test with a real EventTarget, so change events travel the browser's own path.
 */
import type { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion, useMediaQuery } from '../../components/ui/use-media-query';

const WIDE_QUERY = '(min-width: 64rem)';

/** A MediaQueryList whose `matches` the test flips before announcing the change. */
class FakeQueryList extends EventTarget implements MediaQueryList {
  matches: boolean;
  readonly media: string;
  onchange = null;

  constructor(media: string, matches: boolean) {
    super();
    this.media = media;
    this.matches = matches;
  }

  addListener(): void {
    // The legacy listener API is never used by the hook; addEventListener is.
  }

  removeListener(): void {
    // See addListener.
  }
}

function stubMatchMedia(matches: (query: string) => boolean): Map<string, FakeQueryList> {
  const lists = new Map<string, FakeQueryList>();
  vi.stubGlobal('matchMedia', (query: string): MediaQueryList => {
    const list = lists.get(query) ?? new FakeQueryList(query, matches(query));
    lists.set(query, list);
    return list;
  });
  return lists;
}

function Probe(): ReactElement {
  return <p>{useMediaQuery(WIDE_QUERY) ? 'wide' : 'narrow'}</p>;
}

describe('useMediaQuery', () => {
  it('reports false where matchMedia is missing', () => {
    render(<Probe />);
    expect(screen.getByText('narrow')).toBeInTheDocument();
  });

  it('follows change events while mounted and stops listening on unmount', () => {
    const lists = stubMatchMedia(() => false);
    const { unmount } = render(<Probe />);
    const list = lists.get(WIDE_QUERY);
    expect(list).toBeDefined();
    if (list === undefined) return;
    act(() => {
      list.matches = true;
      list.dispatchEvent(new Event('change'));
    });
    expect(screen.getByText('wide')).toBeInTheDocument();
    const removed = vi.spyOn(list, 'removeEventListener');
    unmount();
    expect(removed).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('renders the default on the server, whatever the browser would match', () => {
    stubMatchMedia(() => true);
    expect(renderToString(<Probe />)).toContain('narrow');
  });
});

describe('prefersReducedMotion', () => {
  it('is false where matchMedia is missing', () => {
    expect(prefersReducedMotion()).toBe(false);
  });

  it('follows the system preference', () => {
    stubMatchMedia((query) => query.includes('reduce'));
    expect(prefersReducedMotion()).toBe(true);
    stubMatchMedia(() => false);
    expect(prefersReducedMotion()).toBe(false);
  });
});
