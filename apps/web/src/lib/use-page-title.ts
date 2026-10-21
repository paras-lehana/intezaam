/**
 * Sets the document title for the current page.
 *
 * Responsibility: give every route a distinct title so screen-reader users and browser
 * tabs know where they are (WCAG 2.4.2). Boundary: each page passes its own title text.
 */
import { useEffect } from 'react';

export const PRODUCT_NAME = 'Intezaam';

/**
 * The full title a page shows in the browser tab.
 * @example
 * pageTitle('How it works'); // 'How it works · Intezaam'
 */
export function pageTitle(title: string): string {
  return `${title} · ${PRODUCT_NAME}`;
}

/**
 * Sets `document.title` while the calling page is mounted.
 * @example
 * usePageTitle('Plan your celebration');
 */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = pageTitle(title);
  }, [title]);
}
