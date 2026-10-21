/**
 * Page shell: skip link, header, main landmark and footer.
 *
 * Responsibility: the landmarks every page shares. Boundary: page content renders through
 * the router outlet inside a Suspense boundary, so lazily loaded pages (Plan, About) show
 * an announced fallback while the header and footer stay put. `main` spans the full width
 * so the home hero can run edge to edge; pages wrap their own content in `.container`.
 * RouteFocus sits inside the same boundary, so after a page change focus moves to the new
 * page's h1 (or the part a link names) only once that page has rendered.
 */
import { type ReactElement, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { LoadingFallback } from '../ui/LoadingFallback';
import { Footer } from './Footer';
import { Header } from './Header';
import { MAIN_ID, RouteFocus } from './RouteFocus';

export function Layout(): ReactElement {
  return (
    <>
      <a className="skip-link" href={`#${MAIN_ID}`}>
        Skip to main content
      </a>
      <Header />
      <main id={MAIN_ID} className="site-main" tabIndex={-1}>
        <Suspense fallback={<LoadingFallback label="Loading the page…" />}>
          <Outlet />
          <RouteFocus />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
