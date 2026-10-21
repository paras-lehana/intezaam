/**
 * What a page change does for keyboard and screen-reader users.
 *
 * Responsibility: after the router moves to another page, start the reader at the top of
 * the new page — scroll up and focus its h1, so a screen reader announces the new page and
 * Tab continues from there — or, when the link names a part of the page (`/about#sources`),
 * scroll to that part and focus it. A same-page link to a part (`#sources`) also lands
 * there. Boundary: the first load is left to the browser (only a named part is scrolled to);
 * a page that already placed focus inside the main landmark (the planner's heading) keeps
 * it; rendered inside the layout's Suspense boundary, so it runs only once a lazily loaded
 * page is on screen.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/** The main landmark's id (Layout renders it; the skip link points at it). */
export const MAIN_ID = 'main';

function partNamed(hash: string): HTMLElement | null {
  return hash.length > 1 ? document.getElementById(hash.slice(1)) : null;
}

function scrollToPart(target: HTMLElement): void {
  // scrollIntoView is missing in some engines (and in jsdom); focus still works without it.
  if (typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'start' });
}

/** True when the new page already moved focus somewhere inside its main landmark. */
function pageTookFocus(main: HTMLElement): boolean {
  const active = document.activeElement;
  return active !== null && active !== main && main.contains(active);
}

function focusPageStart(main: HTMLElement): void {
  window.scrollTo(0, 0);
  (main.querySelector<HTMLElement>('h1') ?? main).focus({ preventScroll: true });
}

function focusPart(target: HTMLElement, main: HTMLElement): void {
  scrollToPart(target);
  target.focus({ preventScroll: true });
  // A part that cannot take focus still decides the scroll; focus goes to the page's h1.
  if (document.activeElement !== target) {
    (main.querySelector<HTMLElement>('h1') ?? main).focus({ preventScroll: true });
  }
}

export function RouteFocus(): null {
  const { pathname, hash } = useLocation();
  const previousPath = useRef<string | null>(null);

  useEffect(() => {
    const before = previousPath.current;
    previousPath.current = pathname;
    const main = document.getElementById(MAIN_ID);
    const part = partNamed(hash);
    if (main === null) return;
    if (before === null || before === pathname) {
      // First load, or a link to another part of this same page.
      if (part !== null) {
        if (before === null) scrollToPart(part);
        else focusPart(part, main);
      }
      return;
    }
    if (pageTookFocus(main)) return;
    if (part === null) focusPageStart(main);
    else focusPart(part, main);
  }, [pathname, hash]);

  return null;
}
