/**
 * Home hero — the espresso cover with two gold glows, the wordmark and the ledger page.
 *
 * Responsibility: the page's one h1, the promise in one line, the two calls to action and
 * the trust points; the ruled ledger page (VerdictPreview) is the hero object. Boundary:
 * the glows are CSS gradients on the section (home.css); there is no motion here besides
 * the page's single stamp moment inside the preview.
 */
import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { VerdictPreview } from './VerdictPreview';

/** One chip per claim; each is true of the shipped app. */
export const TRUST_POINTS = [
  'GenAI reads and writes; code decides',
  'A reason and a source behind every number',
  'Plans and messages in 11 languages',
  'No accounts, nothing stored',
] as const;

export function Hero(): ReactElement {
  return (
    <section className="hero" aria-labelledby="hero-heading">
      <div className="container hero__inner">
        <div className="hero__copy">
          <p className="hero__wordmark">
            Intez<em>aam</em>{' '}
            <span className="hero__deva" lang="hi">
              इंतज़ाम
            </span>
          </p>
          <h1 id="hero-heading" className="hero__title">
            Every arrangement, <em>one plan</em>.
          </h1>
          <p className="hero__lede">
            Tell us about your wedding, birthday or community event — in English, Hindi or Hinglish.
            Intezaam works out a budget that adds up, a timeline counted back from your date, vendor
            checklists, permissions and ideas, and shows the reason behind every number.
          </p>
          <div className="hero__actions">
            <Link className="button button--cta button--large" to="/plan">
              Start planning
            </Link>
            <Link className="button button--on-cover button--large" to="/about">
              See how it works
            </Link>
          </div>
          <ul className="plain-list hero__trust" role="list" aria-label="Why you can rely on it">
            {TRUST_POINTS.map((point) => (
              <li key={point} className="hero__trust-item">
                <span className="hero__spark" aria-hidden="true">
                  ✦
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div className="hero__object">
          <VerdictPreview />
        </div>
      </div>
    </section>
  );
}
