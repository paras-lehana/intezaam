/**
 * Tests for domain/languages.ts: the eleven plan languages and their labels.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_LANGUAGE, LANGUAGE_CODES, LANGUAGES, languageLabel } from '../domain/languages.js';

describe('plan languages', () => {
  it('offers eleven languages with Indian BCP-47 tags, English by default', () => {
    expect(LANGUAGE_CODES).toHaveLength(11);
    for (const code of LANGUAGE_CODES) expect(LANGUAGES[code].bcp47.endsWith('-IN')).toBe(true);
    expect(DEFAULT_LANGUAGE).toBe('en');
  });

  it('labels a language by its own name first', () => {
    expect(languageLabel('en')).toBe('English');
    expect(languageLabel('hi')).toBe(`${LANGUAGES.hi.nativeName} (Hindi)`);
  });
});
