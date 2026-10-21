/**
 * Responsibility: WCAG 2.4.11 (Focus not obscured, technique C43) for every band the pages
 * pin — the header, the phone's "Details | Plan" switch and action bar, and the wide tab
 * bar. Each band's height and each scroll offset is read from the stylesheets themselves
 * and resolved through tokens.css, then the sums are checked: a control scrolled into view
 * by focus lands clear of every band above and below it, and no two bands stack.
 * Boundary: geometry from declared CSS only (no layout engine in jsdom); the browser's own
 * focus scrolling honours scroll-padding and scroll-margin, which is what C43 relies on.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** CSS initial font-size: what 1 rem is at the default zoom and inside media queries. */
const PX_PER_REM = 16;
/** iOS home-indicator insets (landscape 21 px, portrait 34 px) plus none at all. */
const SAFE_AREA_INSETS = [0, 21, 34] as const;
/** The wide tab bar's worst case: eight short labels wrap to at most two rows (tokens.css). */
const TAB_ROWS = 2;
const PHONE_QUERY = '@media (width < 64rem)';
const WIDE_QUERY = '@media (min-width: 64rem)';

function sheet(name: string): string {
  return readFileSync(join(import.meta.dirname, '..', '..', 'styles', name), 'utf8').replace(
    /\r\n/g,
    '\n',
  );
}

const TOKENS: ReadonlyMap<string, string> = (() => {
  const found = new Map<string, string>();
  for (const [, name, value] of sheet('tokens.css').matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    if (name !== undefined && value !== undefined && !found.has(name)) {
      found.set(name, value.trim());
    }
  }
  return found;
})();

/** Resolves a length expression (var, calc, env, px, rem, +, -, *) to CSS pixels. */
function px(expression: string, safeArea = 0): number {
  let text = expression.replace(/env\(safe-area-inset-bottom\)/g, `${safeArea}px`);
  while (text.includes('var(')) {
    text = text.replace(/var\(--([\w-]+)\)/g, (_, name: string) => {
      const value = TOKENS.get(name);
      if (value === undefined) throw new Error(`unknown token --${name}`);
      return `(${value})`;
    });
  }
  const parts = text.replace(/calc\(/g, '(').match(/\d*\.?\d+(?:px|rem)?|[()+\-*]/g) ?? [];
  let at = 0;
  const next = (): string => {
    const part = parts[at];
    at += 1;
    if (part === undefined) throw new Error(`unexpected end of "${expression}"`);
    return part;
  };
  const factor = (): number => {
    const part = next();
    if (part === '(') {
      const value = sum();
      next();
      return value;
    }
    const unit = /^(\d*\.?\d+)(px|rem)?$/.exec(part);
    if (unit === null) throw new Error(`unexpected "${part}" in "${expression}"`);
    return Number(unit[1]) * (unit[2] === 'rem' ? PX_PER_REM : 1);
  };
  function product(): number {
    let value = factor();
    while (parts[at] === '*') {
      at += 1;
      value *= factor();
    }
    return value;
  }
  function sum(): number {
    let value = product();
    while (parts[at] === '+' || parts[at] === '-') {
      const sign = next() === '+' ? 1 : -1;
      value += sign * product();
    }
    return value;
  }
  return sum();
}

/** The value of `property` in the first `selector {` rule at or after `from`. */
function declaration(css: string, selector: string, property: string, from = 0): string {
  const ruleAt = css.indexOf(`${selector} {`, from);
  if (ruleAt < 0) throw new Error(`no rule "${selector}"`);
  const body = css.slice(ruleAt, css.indexOf('}', ruleAt));
  const value = new RegExp(`[\\s;{]${property}:\\s*([^;]+);`).exec(body)?.[1];
  if (value === undefined) throw new Error(`no ${property} in "${selector}"`);
  return value.trim();
}

/** Splits a shorthand on spaces outside parentheses: `a calc(b + c)` → [a, calc(b + c)]. */
function shorthand(value: string): readonly string[] {
  const parts: string[] = [''];
  let depth = 0;
  for (const char of value) {
    depth += char === '(' ? 1 : char === ')' ? -1 : 0;
    if (char === ' ' && depth === 0) parts.push('');
    else parts[parts.length - 1] += char;
  }
  return parts.filter((part) => part !== '');
}

const firstLength = (value: string): number => px(shorthand(value)[0] ?? '');

const base = sheet('base.css');
const layout = sheet('layout.css');
const split = sheet('split.css');
const tabs = sheet('tabs.css');
const phoneAt = split.indexOf(PHONE_QUERY);
const wideAt = split.indexOf(WIDE_QUERY);
const touch = px('var(--touch-target)');
const headerBottom =
  px('var(--header-height)') + firstLength(declaration(layout, '.site-header', 'border-bottom'));
const pageTop = px(declaration(base, 'html', 'scroll-padding-top'));

describe('focus not obscured by pinned bands (WCAG 2.4.11)', () => {
  it('scrolls every focused control below the sticky header', () => {
    expect(pageTop).toBeGreaterThan(headerBottom);
  });

  it('shares one breakpoint between the phone split and the wide tab bar', () => {
    const queries = [...split.matchAll(/@media \([^)]*\)/g), ...tabs.matchAll(/@media \([^)]*\)/g)];
    const breakpoints = new Set(queries.map(([query]) => query.replace(/\D*([\d.]+rem).*/, '$1')));
    expect(phoneAt).toBeGreaterThanOrEqual(0);
    expect(wideAt).toBeGreaterThanOrEqual(0);
    expect([...breakpoints]).toEqual(['64rem']);
  });

  it('pins the tab bar only where the switch and action bar are hidden, so bands never stack', () => {
    expect(tabs.indexOf('position: sticky')).toBeGreaterThan(tabs.indexOf(WIDE_QUERY));
    expect(tabs.indexOf(WIDE_QUERY)).toBeGreaterThanOrEqual(0);
    expect(split.slice(wideAt)).toMatch(/\.split-switch,\s*\.action-bar \{\s*display: none;/);
  });

  it('keeps pane content clear of the phone switch pinned under the header', () => {
    const switchTop = px(declaration(split, '.split-switch', 'top'));
    const padding = px(declaration(split, '.split-switch', 'padding'));
    const border = firstLength(declaration(split, '.split-switch', 'border'));
    const height = px('var(--split-switch-height)');
    const paneMargin = px(declaration(split, '.plan-split__pane *', 'scroll-margin-top', phoneAt));

    expect(height).toBe(touch + 2 * padding + 2 * border);
    expect(switchTop).toBeGreaterThanOrEqual(headerBottom);
    expect(pageTop + paneMargin).toBeGreaterThan(switchTop + height);
  });

  it.each(SAFE_AREA_INSETS)('keeps controls above the phone action bar (inset %i px)', (inset) => {
    const bar = shorthand(declaration(split, '.action-bar', 'padding'));
    const contentHeight =
      touch +
      px(bar[0] ?? '', inset) +
      px(bar[2] ?? bar[0] ?? '', inset) +
      firstLength(declaration(split, '.action-bar', 'border-top'));
    const barHeight = Math.max(px(declaration(split, '.action-bar', 'min-height')), contentHeight);
    const pageBottom = declaration(
      split,
      'html:has(.plan-split)',
      'scroll-padding-bottom',
      phoneAt,
    );
    const bodyBottom = declaration(split, 'body:has(.plan-split)', 'padding-bottom', phoneAt);

    expect(px(pageBottom, inset)).toBeGreaterThan(barHeight);
    expect(px(bodyBottom, inset)).toBeGreaterThanOrEqual(barHeight);
  });

  it('keeps tab panel content clear of the wide sticky tab bar', () => {
    const tabsWideAt = tabs.indexOf(WIDE_QUERY);
    const barTop = px(declaration(tabs, '.tabs--sticky .tabs__list', 'top', tabsWideAt));
    const gap = px(declaration(tabs, '.tabs__list', 'gap'));
    const padding = px(declaration(tabs, '.tabs__list', 'padding'));
    const border = firstLength(declaration(tabs, '.tabs__list', 'border'));
    const height = px('var(--tab-bar-height)');
    const panelMargin = px(
      declaration(tabs, '.tabs--sticky .tabs__panel *', 'scroll-margin-top', tabsWideAt),
    );

    expect(height).toBe(TAB_ROWS * touch + (TAB_ROWS - 1) * gap + 2 * padding + 2 * border);
    expect(barTop).toBeGreaterThanOrEqual(headerBottom);
    expect(pageTop + panelMargin).toBeGreaterThan(barTop + height);
  });
});
