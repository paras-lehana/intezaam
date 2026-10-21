/**
 * Display preferences: colour theme and decorative motion, remembered on this device.
 *
 * Responsibility: read, apply and store the two reader choices as attributes on <html>
 * (`data-theme`, `data-motion`) that the CSS keys off. Boundary: storage may be blocked
 * (private mode), so every access is guarded; without a stored choice the theme follows
 * the system setting and motion stays on (reduced-motion users never see it anyway).
 */

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'intezaam:theme';
export const MOTION_STORAGE_KEY = 'intezaam:motion';

/** Ivory pages are the designed default; dark is the espresso alternative. */
export const DEFAULT_THEME: Theme = 'light';

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';
const MOTION_PAUSED = 'paused';
const MOTION_PLAYING = 'playing';

/**
 * Reads a stored preference; null when absent or when storage is blocked.
 * @example
 * readPreference(THEME_STORAGE_KEY); // 'dark' after a reader chose dark
 */
export function readPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Stores a preference; a blocked store still leaves the choice applied for this visit.
 * @example
 * storePreference(THEME_STORAGE_KEY, 'dark');
 */
export function storePreference(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked (private mode): the attribute on <html> still carries the choice.
  }
}

/**
 * The theme the operating system asks for, or the default where matchMedia is missing.
 * @example
 * systemTheme(); // 'dark' on a phone in dark mode
 */
export function systemTheme(): Theme {
  if (typeof window.matchMedia !== 'function') return DEFAULT_THEME;
  return window.matchMedia(DARK_SCHEME_QUERY).matches ? 'dark' : 'light';
}

/**
 * The stored theme when there is one, else the system's.
 * @example
 * initialTheme(); // 'light' on a first visit from a light-mode system
 */
export function initialTheme(): Theme {
  const stored = readPreference(THEME_STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : systemTheme();
}

/**
 * Sets `data-theme` on <html>; tokens.css switches every colour from it.
 * @example
 * applyTheme('dark');
 */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset['theme'] = theme;
}

/**
 * True when the reader paused decorative motion on an earlier visit.
 * @example
 * initialMotionPaused(); // false on a first visit
 */
export function initialMotionPaused(): boolean {
  return readPreference(MOTION_STORAGE_KEY) === MOTION_PAUSED;
}

/**
 * Sets or clears `data-motion="paused"`, which stops every animation (primitives.css).
 * @example
 * applyMotion(true);
 */
export function applyMotion(paused: boolean): void {
  const root = document.documentElement;
  if (paused) root.dataset['motion'] = MOTION_PAUSED;
  else delete root.dataset['motion'];
}

/**
 * Stores the motion choice.
 * @example
 * storeMotionPaused(true);
 */
export function storeMotionPaused(paused: boolean): void {
  storePreference(MOTION_STORAGE_KEY, paused ? MOTION_PAUSED : MOTION_PLAYING);
}

/**
 * Applies both stored choices before the first render, so there is no flash of the wrong theme.
 * @example
 * applyStoredPreferences();
 */
export function applyStoredPreferences(): void {
  applyTheme(initialTheme());
  applyMotion(initialMotionPaused());
}
