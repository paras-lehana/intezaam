/**
 * The espresso cover bar: logo mark + wordmark, primary navigation and the two toggles.
 *
 * Responsibility: brand + nav on every page. Boundary: NavLink marks the current page with
 * aria-current, so the active item is announced and underlined, not only coloured. The
 * bar is solid espresso (no glass or backdrop-filter, a design rule from the old site).
 */
import type { ReactElement } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { BrandMark } from './BrandMark';
import { MotionToggle } from './MotionToggle';
import { ThemeToggle } from './ThemeToggle';

export const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/plan', label: 'Plan' },
  { to: '/about', label: 'How it works' },
] as const;

export const TAGLINE = 'Every arrangement, one plan';

export function Header(): ReactElement {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand">
          <BrandMark />
          <span className="brand__text">
            <span className="brand__name">
              Intez<em>aam</em>
            </span>
            <span className="brand__tagline">{TAGLINE}</span>
          </span>
        </Link>
        <nav className="site-nav" aria-label="Main">
          <ul className="plain-list" role="list">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.to === '/'}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="site-header__actions">
          <MotionToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
