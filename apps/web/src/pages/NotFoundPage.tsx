/**
 * Fallback page for unknown routes.
 *
 * Responsibility: a clear dead-end message with two ways back. Boundary: static.
 */
import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { PageHero } from '../components/ui/PageHero';
import { usePageTitle } from '../lib/use-page-title';

export const NOT_FOUND_TITLE = 'Page not found';

export function NotFoundPage(): ReactElement {
  usePageTitle(NOT_FOUND_TITLE);
  return (
    <div className="container not-found">
      <p className="not-found__code" aria-hidden="true">
        404
      </p>
      <PageHero eyebrow="This page is not in the ledger" title={NOT_FOUND_TITLE}>
        The page you asked for does not exist. Your plan is safe — it lives in your browser.
      </PageHero>
      <div className="not-found__actions">
        <Link className="button button--cta" to="/plan">
          Open the planner
        </Link>
        <Link className="button button--ghost" to="/">
          Go to the home page
        </Link>
      </div>
    </div>
  );
}
