/**
 * Site footer — the back cover of the ledger: what the product is, the principle behind
 * it, the privacy promise and the estimates note.
 *
 * Responsibility: persistent trust information on every page. Boundary: static copy;
 * every claim here matches how the app works (plans are computed in the browser and are
 * not stored; personal details are removed before any text reaches the AI model).
 */
import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from './BrandMark';

export const PRINCIPLE = 'GenAI reads and writes; code decides.';

export function Footer(): ReactElement {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner container">
        <div>
          <p className="site-footer__brand">
            <BrandMark />
            <span>
              Intezaam <span lang="hi">इंतज़ाम</span>
            </span>
          </p>
          <p>
            A planning assistant for Indian weddings, birthdays and community events. {PRINCIPLE}{' '}
            Money, dates, counts and checklists come from tested rules; Gemini reads your brief,
            explains the plan and writes ideas and messages.
          </p>
        </div>
        <div>
          <p className="site-footer__title">Your privacy</p>
          <p>
            No accounts and no database. Your plan is worked out in your browser and is not stored
            on our server. Personal details are removed before any text reaches the AI model.
          </p>
        </div>
        <div>
          <p className="site-footer__title">Estimates, not quotes</p>
          <p>
            Every amount is an estimate with its source. Get three written quotes before you book.
          </p>
          <ul className="plain-list site-footer__links" role="list">
            <li>
              <Link to="/about">How it works</Link>
            </li>
            <li>
              <Link to="/about#sources">Method and sources</Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
