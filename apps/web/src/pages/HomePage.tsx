/**
 * Home page: the espresso hero, every feature grouped, and the way in.
 *
 * Responsibility: compose the hero, the feature bento and a closing call to action.
 * Boundary: no planning happens here — "Start planning" opens /plan, where the form and
 * the workspace live.
 */
import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { FeatureBento } from '../components/home/FeatureBento';
import { Hero } from '../components/home/Hero';
import { CANONICAL_PATHS, useCanonical } from '../lib/use-canonical';
import { usePageTitle } from '../lib/use-page-title';

export const HOME_TITLE = 'Plan Indian weddings, birthdays and community events';

export function HomePage(): ReactElement {
  usePageTitle(HOME_TITLE);
  useCanonical(CANONICAL_PATHS.home);
  return (
    <>
      <Hero />
      <FeatureBento />
      <section className="closing section" aria-labelledby="closing-heading">
        <div className="container closing__inner ledger">
          <h2 id="closing-heading">Sab intezaam, ek jagah.</h2>
          <p className="lede">
            Five questions are enough to start. Add traditions, food, priorities and style whenever
            you like — the plan updates as you go.
          </p>
          <Link className="button button--cta button--large" to="/plan">
            Start planning
          </Link>
        </div>
      </section>
    </>
  );
}
