/**
 * Responsibility: every text/background and control/background pair the design tokens
 * define meets WCAG 2.x contrast in both themes — text 4.5:1 (1.4.3), input borders and
 * focus rings 3:1 (1.4.11, 2.4.13) — measured from tokens.css itself, so a token edit that
 * breaks contrast fails here instead of in an audit. Translucent colours are composited
 * over their background first, as the browser paints them.
 * Boundary: the pairs are the ones the stylesheets actually draw; the ratios are computed,
 * never typed. Decorative colours (gold rules, the hero's aria-hidden bars, whose values
 * are printed beside them as text) are not text and are left out on purpose.
 */
import { describe, expect, it } from 'vitest';
import tokensCss from '../../styles/tokens.css?raw';

type Theme = 'light' | 'dark';
type Rgba = readonly [number, number, number, number];

/** WCAG 2.x SC 1.4.3 (AA, normal text). */
const TEXT_MIN = 4.5;
/** WCAG 2.x SC 1.4.11 (non-text contrast: input borders, focus indicators). */
const NON_TEXT_MIN = 3;

/** Light is the default on :root; dark overrides only what changes. */
const THEME_SELECTORS: Readonly<Record<Theme, string>> = {
  light: ':root {',
  dark: ":root[data-theme='dark'] {",
};
const THEMES: readonly Theme[] = ['light', 'dark'];

const TEXT_TOKENS = [
  'color-ink',
  'color-text',
  'color-text-muted',
  'color-gold-text',
  'color-rose-text',
  'color-success',
  'color-info',
  'color-danger',
  'color-link',
] as const;
/** Every surface the pages put text on: page, alternate page, card, selected tab, selected chip. */
const PAGE_BACKGROUNDS = [
  'color-bg',
  'color-bg-alt',
  'color-surface',
  'color-surface-selected',
  'color-chip-selected',
] as const;
const COVER_TEXT = ['on-cover', 'on-cover-dim', 'on-cover-gold'] as const;
const COVER_BACKGROUNDS = ['cover-bg', 'cover-bg-2', 'cover-card', 'cover-raised'] as const;
const CTA_FILLS = ['cta-start', 'cta-end', 'cta-hover-start', 'cta-hover-end'] as const;

interface Pair {
  readonly fg: string;
  readonly bg: string;
  readonly min: number;
}

const PAIRS: readonly Pair[] = [
  ...TEXT_TOKENS.flatMap((fg) => PAGE_BACKGROUNDS.map((bg) => ({ fg, bg, min: TEXT_MIN }))),
  { fg: 'color-danger', bg: 'color-danger-soft', min: TEXT_MIN },
  { fg: 'color-success', bg: 'color-success-soft', min: TEXT_MIN },
  { fg: 'color-text', bg: 'color-danger-soft', min: TEXT_MIN },
  { fg: 'color-text', bg: 'color-success-soft', min: TEXT_MIN },
  ...COVER_TEXT.flatMap((fg) => COVER_BACKGROUNDS.map((bg) => ({ fg, bg, min: TEXT_MIN }))),
  { fg: 'page-ink', bg: 'page-bg', min: TEXT_MIN },
  { fg: 'page-muted', bg: 'page-bg', min: TEXT_MIN },
  { fg: 'page-stamp', bg: 'page-bg', min: TEXT_MIN },
  ...CTA_FILLS.map((bg) => ({ fg: 'cta-ink', bg, min: TEXT_MIN })),
  ...['color-border', 'color-focus'].flatMap((fg) =>
    PAGE_BACKGROUNDS.map((bg) => ({ fg, bg, min: NON_TEXT_MIN })),
  ),
  ...['cover-bg', 'cover-bg-2', 'cover-card'].map((bg) => ({
    fg: 'cover-focus',
    bg,
    min: NON_TEXT_MIN,
  })),
];

const HEX_COLOR = /^#([0-9a-f]{6})$/i;
const RGB_ALPHA_COLOR = /^rgb\((\d+) (\d+) (\d+) \/ (\d+)%\)$/;
const DECLARATION = /--([a-z0-9-]+):\s*([^;]+);/g;
const CHANNEL_MAX = 255;
const PERCENT = 100;
/** sRGB → linear (WCAG 2.x relative luminance definition). */
const SRGB_KNEE = 0.04045;
const SRGB_LINEAR_SLOPE = 12.92;
const SRGB_OFFSET = 0.055;
const SRGB_SCALE = 1.055;
const SRGB_GAMMA = 2.4;
const LUMA = [0.2126, 0.7152, 0.0722] as const;
const FLARE = 0.05;

function declarations(selector: string): Readonly<Record<string, string>> {
  const start = tokensCss.indexOf(selector);
  const block = tokensCss.slice(start, tokensCss.indexOf('\n}', start));
  return Object.fromEntries(
    [...block.matchAll(DECLARATION)].map(([, name, value]) => [name, value]),
  );
}

const LIGHT = declarations(THEME_SELECTORS.light);
const TOKENS: Readonly<Record<Theme, Readonly<Record<string, string>>>> = {
  light: LIGHT,
  dark: { ...LIGHT, ...declarations(THEME_SELECTORS.dark) },
};

function parseColor(value: string | undefined): Rgba {
  const hex = HEX_COLOR.exec(value ?? '');
  if (hex?.[1] !== undefined) {
    const n = Number.parseInt(hex[1], 16);
    return [(n >> 16) & CHANNEL_MAX, (n >> 8) & CHANNEL_MAX, n & CHANNEL_MAX, 1];
  }
  const rgb = RGB_ALPHA_COLOR.exec(value ?? '');
  if (rgb === null) throw new Error(`not a token colour: ${String(value)}`);
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), Number(rgb[4]) / PERCENT];
}

function linear(channel: number): number {
  const c = channel / CHANNEL_MAX;
  return c <= SRGB_KNEE ? c / SRGB_LINEAR_SLOPE : ((c + SRGB_OFFSET) / SRGB_SCALE) ** SRGB_GAMMA;
}

function luminance(rgb: readonly number[]): number {
  return LUMA.reduce((sum, weight, i) => sum + weight * linear(rgb[i] ?? 0), 0);
}

/** WCAG contrast of a token over another, compositing a translucent foreground first. */
function contrast(theme: Theme, pair: Pair): number {
  const bg = parseColor(TOKENS[theme][pair.bg]);
  const fg = parseColor(TOKENS[theme][pair.fg]);
  const alpha = fg[3];
  const painted = [0, 1, 2].map((i) => (fg[i] ?? 0) * alpha + (bg[i] ?? 0) * (1 - alpha));
  const [hi, lo] = [luminance(painted), luminance(bg)].sort((a, b) => b - a);
  return ((hi ?? 0) + FLARE) / ((lo ?? 0) + FLARE);
}

describe('design token contrast', () => {
  it('reads every pair from tokens.css in both themes', () => {
    for (const theme of THEMES) {
      for (const pair of PAIRS) {
        expect(() => parseColor(TOKENS[theme][pair.fg])).not.toThrow();
        expect(() => parseColor(TOKENS[theme][pair.bg])).not.toThrow();
      }
    }
  });

  it.each(THEMES)('meets WCAG AA for text and 3:1 for borders and focus (%s)', (theme) => {
    const failing = PAIRS.filter((pair) => contrast(theme, pair) < pair.min).map(
      (pair) => `${pair.fg} on ${pair.bg}: ${contrast(theme, pair).toFixed(2)}:1`,
    );
    expect(failing).toEqual([]);
  });

  it('keeps the dimmed cover text above the 60% alpha floor', () => {
    const [, , , alpha] = parseColor(TOKENS.light['on-cover-dim']);
    expect(alpha).toBeGreaterThanOrEqual(0.6);
  });
});
