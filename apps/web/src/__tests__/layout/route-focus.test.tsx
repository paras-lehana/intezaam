/**
 * Responsibility: what a page change does for keyboard and screen-reader users — following a
 * link to another page scrolls to the top and focuses the new page's h1; a link that names a
 * part (`/about#sources`) focuses that part; the first load moves nothing; and a page that
 * placed focus itself keeps it. Boundary: the real layout, header, footer and pages in a
 * memory router; only window.scrollTo (absent in jsdom) and the catalog fetch are stubbed.
 */
import { type ReactElement, useEffect, useRef } from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { googleServicesResponseSchema } from '@intezaam/core/schemas';
import { Layout } from '../../components/layout/Layout';
import { AboutPage } from '../../pages/AboutPage';
import { HomePage } from '../../pages/HomePage';
import { jsonResponse, renderAt, stubFetch } from '../helpers';

const SELF_FOCUS_LABEL = 'Focused by its page';

/** A page that moves focus itself on arrival (as the planner does with its plan heading). */
function SelfFocusingPage(): ReactElement {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <>
      <h1>Self focusing</h1>
      <button ref={ref} type="button">
        {SELF_FOCUS_LABEL}
      </button>
    </>
  );
}

function Shell(): ReactElement {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="self" element={<SelfFocusingPage />} />
        <Route path="*" element={<Link to="/self">Go to the self-focusing page</Link>} />
      </Route>
    </Routes>
  );
}

function setUp(path: string): { scrollTo: ReturnType<typeof vi.fn> } {
  stubFetch(
    ...[1, 2].map(() => jsonResponse(googleServicesResponseSchema.parse({ services: [] }))),
  );
  const scrollTo = vi.fn();
  vi.stubGlobal('scrollTo', scrollTo);
  renderAt(<Shell />, path);
  return { scrollTo };
}

describe('page changes', () => {
  it('leaves focus alone on the first load', () => {
    const { scrollTo } = setUp('/');
    expect(document.activeElement).toBe(document.body);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('starts the reader at the top of the new page, on its h1', async () => {
    const { scrollTo } = setUp('/');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    await userEvent.setup().click(within(nav).getByRole('link', { name: 'How it works' }));
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveFocus();
    expect(heading).toHaveAttribute('tabindex', '-1');
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('lands on the part a link names: /about#sources', async () => {
    setUp('/');
    const footer = screen.getByRole('contentinfo');
    await userEvent.setup().click(within(footer).getByRole('link', { name: 'Method and sources' }));
    expect(document.activeElement).toHaveAttribute('id', 'sources');
  });

  it('keeps focus where the new page put it', async () => {
    setUp('/elsewhere');
    await userEvent
      .setup()
      .click(screen.getByRole('link', { name: 'Go to the self-focusing page' }));
    expect(screen.getByRole('button', { name: SELF_FOCUS_LABEL })).toHaveFocus();
  });
});
