/**
 * Subscribes a component to a CSS media query.
 *
 * Responsibility: tell components when the viewport crosses a breakpoint or a reader
 * preference changes (e.g. reduced motion before a smooth scroll). Boundary: uses the
 * browser's own change events via useSyncExternalStore; where matchMedia is missing (old
 * browsers, tests) it reports `false`, i.e. the mobile-first, motion-free default.
 */
import { useCallback, useSyncExternalStore } from 'react';

function canMatch(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

/**
 * True while the media query matches.
 * @example
 * const wide = useMediaQuery('(min-width: 64rem)');
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!canMatch()) return () => undefined;
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => canMatch() && window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * True when the reader asked the system for reduced motion (scroll jumps instead of glides).
 * @example
 * const reduced = prefersReducedMotion();
 */
export function prefersReducedMotion(): boolean {
  return canMatch() && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
