/**
 * Responsibility: display preferences — stored choices win, the system theme is the fallback,
 * blocked storage never throws, and the <html> attributes the CSS keys off are set and
 * cleared. Boundary: matchMedia and Storage are stubbed per test; setup.ts clears storage
 * between tests.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_THEME,
  MOTION_STORAGE_KEY,
  THEME_STORAGE_KEY,
  applyMotion,
  applyStoredPreferences,
  applyTheme,
  initialMotionPaused,
  initialTheme,
  readPreference,
  storeMotionPaused,
  storePreference,
  systemTheme,
} from '../../lib/preferences';

function stubSystemDark(dark: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: dark && query.includes('dark'), media: query })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('theme', () => {
  it('falls back to the default where matchMedia is missing', () => {
    expect(systemTheme()).toBe(DEFAULT_THEME);
    expect(initialTheme()).toBe(DEFAULT_THEME);
  });

  it('follows the system when nothing is stored', () => {
    stubSystemDark(true);
    expect(systemTheme()).toBe('dark');
    expect(initialTheme()).toBe('dark');
  });

  it('lets a stored choice beat the system, and ignores junk values', () => {
    stubSystemDark(true);
    storePreference(THEME_STORAGE_KEY, 'light');
    expect(initialTheme()).toBe('light');
    storePreference(THEME_STORAGE_KEY, 'sepia');
    expect(initialTheme()).toBe('dark');
  });

  it('sets data-theme on <html>', () => {
    applyTheme('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });
});

describe('motion', () => {
  it('is on until a reader pauses it, and remembers the pause', () => {
    expect(initialMotionPaused()).toBe(false);
    storeMotionPaused(true);
    expect(readPreference(MOTION_STORAGE_KEY)).toBe('paused');
    expect(initialMotionPaused()).toBe(true);
    storeMotionPaused(false);
    expect(initialMotionPaused()).toBe(false);
  });

  it('sets and clears data-motion', () => {
    applyMotion(true);
    expect(document.documentElement.dataset['motion']).toBe('paused');
    applyMotion(false);
    expect(document.documentElement.dataset['motion']).toBeUndefined();
  });
});

describe('storage', () => {
  it('survives blocked storage (private mode)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readPreference(THEME_STORAGE_KEY)).toBeNull();
    expect(() => storePreference(THEME_STORAGE_KEY, 'dark')).not.toThrow();
  });

  it('applies both stored choices before the first render', () => {
    storePreference(THEME_STORAGE_KEY, 'dark');
    storeMotionPaused(true);
    applyStoredPreferences();
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(document.documentElement.dataset['motion']).toBe('paused');
  });
});
