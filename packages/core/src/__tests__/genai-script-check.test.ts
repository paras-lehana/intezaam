/**
 * Tests for the output-language script check (GenAI jobs 2 and 4).
 *
 * Responsibility: text in the chosen language's script passes, English names inside an
 * Indic sentence are tolerated, a reply in the wrong script fails, and text with no letters
 * passes. Boundary: pure.
 */
import { describe, expect, it } from 'vitest';
import { LANGUAGE_CODES, LANGUAGES } from '../domain/languages.js';
import { matchesLanguageScript } from '../genai/script-check.js';

describe('matchesLanguageScript', () => {
  it("accepts each language's own name in its own script", () => {
    for (const code of LANGUAGE_CODES)
      expect(matchesLanguageScript(LANGUAGES[code].nativeName, code)).toBe(true);
  });

  it('tolerates English names and words inside a Hindi sentence', () => {
    expect(
      matchesLanguageScript('जयपुर में 25 Nov 2026 को हमारी शादी है, कृपया GST अलग बताएँ', 'hi'),
    ).toBe(true);
  });

  it('rejects a reply in the wrong script', () => {
    expect(matchesLanguageScript('Wedding in Jaipur on 25 November', 'hi')).toBe(false);
    expect(matchesLanguageScript('जयपुर में शादी', 'en')).toBe(false);
    expect(matchesLanguageScript('जयपुर में शादी', 'ta')).toBe(false);
  });

  it('accepts Marathi in Devanagari and text with no letters', () => {
    expect(matchesLanguageScript('पुण्यात लग्न', 'mr')).toBe(true);
    expect(matchesLanguageScript('25 / 11 / 2026 🙏', 'bn')).toBe(true);
  });
});
