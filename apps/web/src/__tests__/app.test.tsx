/**
 * Responsibility: the route table — "/", "/plan" and "/about" each render their own page
 * inside the shared landmarks with a distinct title and one canonical link for their own
 * path (the lazily loaded pages arrive through the Suspense boundary); an unknown address
 * renders the 404 page with no canonical link; leaving a page removes its link.
 * Boundary: fetch is stubbed for the About catalog; titles and paths come from the pages and
 * the canonical hook, never retyped here.
 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { pageTitle } from '../lib/use-page-title';
import { CANONICAL_PATHS, type CanonicalPath, canonicalHref } from '../lib/use-canonical';
import { ABOUT_TITLE } from '../pages/AboutPage';
import { HOME_TITLE } from '../pages/HomePage';
import { NOT_FOUND_TITLE } from '../pages/NotFoundPage';
import { PLAN_TITLE } from '../pages/PlanPage';
import { jsonResponse, renderAt, stubFetch } from './helpers';

/** A lazy page's chunk is transformed on first import, which is slow in a loaded test run. */
const LAZY_PAGE_TIMEOUT_MS = 10_000;

function canonicalLinks(): readonly string[] {
  return [...document.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]')].map(
    (link) => link.href,
  );
}

function expectCanonical(path: CanonicalPath): void {
  expect(canonicalLinks()).toEqual([canonicalHref(window.location.origin, path)]);
}

describe('routes', () => {
  it('renders the home page at "/" with its title and canonical link', () => {
    renderAt(<App />, CANONICAL_PATHS.home);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(document.title).toBe(pageTitle(HOME_TITLE));
    expectCanonical(CANONICAL_PATHS.home);
  });

  it(
    'loads the planner lazily at "/plan"',
    async () => {
      renderAt(<App />, CANONICAL_PATHS.plan);
      expect(
        await screen.findByRole(
          'heading',
          { level: 1, name: PLAN_TITLE },
          { timeout: LAZY_PAGE_TIMEOUT_MS },
        ),
      ).toBeInTheDocument();
      expect(document.title).toBe(pageTitle(PLAN_TITLE));
      expectCanonical(CANONICAL_PATHS.plan);
    },
    LAZY_PAGE_TIMEOUT_MS * 2,
  );

  it(
    'loads About lazily at "/about"',
    async () => {
      stubFetch(jsonResponse({ services: [] }));
      renderAt(<App />, CANONICAL_PATHS.about);
      expect(
        await screen.findByRole(
          'heading',
          { level: 1, name: ABOUT_TITLE },
          { timeout: LAZY_PAGE_TIMEOUT_MS },
        ),
      ).toBeInTheDocument();
      expectCanonical(CANONICAL_PATHS.about);
    },
    LAZY_PAGE_TIMEOUT_MS * 2,
  );

  it('answers an unknown address with the 404 page and no canonical link', () => {
    renderAt(<App />, '/no-such-page');
    expect(screen.getByRole('heading', { level: 1, name: NOT_FOUND_TITLE })).toBeInTheDocument();
    expect(document.title).toBe(pageTitle(NOT_FOUND_TITLE));
    expect(canonicalLinks()).toEqual([]);
  });

  it('removes the canonical link when the page goes away', () => {
    const { unmount } = renderAt(<App />, CANONICAL_PATHS.home);
    expect(canonicalLinks()).toHaveLength(1);
    unmount();
    expect(canonicalLinks()).toEqual([]);
  });
});
