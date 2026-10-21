/**
 * Points search engines at one address per page.
 *
 * Responsibility: while a page is mounted, add `<link rel="canonical">` for its own path on
 * the origin the reader is on, so `/plan?x` or `/plan#plan=…` (a shared plan) never compete
 * with `/plan` itself. Boundary: each routed page passes its own path; the 404 page passes
 * none, so an unknown address never claims to be canonical. The link is removed on unmount,
 * so moving between routes never leaves two of them in the head.
 */
import { useEffect } from 'react';

/** The routed pages that have a canonical address (the 404 page has none on purpose). */
export const CANONICAL_PATHS = { home: '/', plan: '/plan', about: '/about' } as const;

export type CanonicalPath = (typeof CANONICAL_PATHS)[keyof typeof CANONICAL_PATHS];

/**
 * The canonical address of a path on an origin; query and hash never take part.
 * @example
 * canonicalHref('https://intezaam.lehana.in', '/plan'); // 'https://intezaam.lehana.in/plan'
 */
export function canonicalHref(origin: string, path: CanonicalPath): string {
  return new URL(path, origin).href;
}

/**
 * Adds the page's canonical link while the calling page is mounted.
 * @example
 * useCanonical(CANONICAL_PATHS.plan);
 */
export function useCanonical(path: CanonicalPath): void {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'canonical';
    link.href = canonicalHref(window.location.origin, path);
    document.head.append(link);
    return () => link.remove();
  }, [path]);
}
