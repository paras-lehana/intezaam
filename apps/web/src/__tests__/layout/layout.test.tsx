/**
 * Responsibility: the page shell — skip link, landmarks and exactly one h1 on every route, the
 * current page marked in the navigation, and the theme and motion toggles applying and
 * remembering the choice. Boundary: the route table mirrors App.tsx without the lazily loaded
 * planner page, which the features work owns.
 */
import type { ReactElement } from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { googleServicesResponseSchema } from '@intezaam/core/schemas';
import { Layout } from '../../components/layout/Layout';
import { MOTION_TOGGLE_LABEL } from '../../components/layout/MotionToggle';
import { THEME_TOGGLE_LABEL } from '../../components/layout/ThemeToggle';
import { MOTION_STORAGE_KEY, THEME_STORAGE_KEY } from '../../lib/preferences';
import { AboutPage } from '../../pages/AboutPage';
import { HomePage } from '../../pages/HomePage';
import { NotFoundPage } from '../../pages/NotFoundPage';
import { jsonResponse, renderAt, stubFetch } from '../helpers';

const ROUTES = ['/', '/about', '/no-such-page'] as const;

function Shell(): ReactElement {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

function stubCatalog(): void {
  stubFetch(jsonResponse(googleServicesResponseSchema.parse({ services: [] })));
}

describe('page shell', () => {
  it.each(ROUTES)('has a skip link, landmarks and one h1 on %s', (path) => {
    stubCatalog();
    renderAt(<Shell />, path);
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main',
    );
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('marks the current page in the navigation, and only that one', () => {
    stubCatalog();
    renderAt(<Shell />, '/about');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'How it works' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });
});

describe('display toggles', () => {
  it('starts light when nothing is stored, and remembers a switch to dark', async () => {
    const user = userEvent.setup();
    renderAt(<Shell />, '/');
    const toggle = screen.getByRole('button', { name: THEME_TOGGLE_LABEL });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement.dataset['theme']).toBe('light');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('lets a stored dark choice win on the next visit', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    renderAt(<Shell />, '/');
    expect(screen.getByRole('button', { name: THEME_TOGGLE_LABEL })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('pauses motion on request, remembers it, and resumes', async () => {
    const user = userEvent.setup();
    renderAt(<Shell />, '/');
    const pause = screen.getByRole('button', { name: MOTION_TOGGLE_LABEL });
    expect(pause).toHaveAttribute('aria-pressed', 'false');
    await user.click(pause);
    expect(pause).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset['motion']).toBe('paused');
    expect(window.localStorage.getItem(MOTION_STORAGE_KEY)).toBe('paused');
    await user.click(pause);
    expect(document.documentElement.dataset['motion']).toBeUndefined();
  });
});
