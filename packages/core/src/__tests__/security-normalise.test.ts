/**
 * Tests for the match-key folding used by the brief reader and every evidence check.
 *
 * Responsibility: nukta and chandrabindu variants fold together, Indic digits become
 * ASCII, vulgar fractions become decimals without the NFKC "1½ → 11⁄2" trap, Latin accents
 * go but Indic vowel signs stay, and display text stays plain NFC. Boundary: pure.
 */
import { describe, expect, it } from 'vitest';
import { foldForMatch, toDisplayText } from '../security/normalise.js';

describe('foldForMatch', () => {
  it('folds nukta and no-nukta spellings to one key', () => {
    expect(foldForMatch('इंतज़ाम')).toBe(foldForMatch('इंतजाम'));
    expect(foldForMatch('हज़ार')).toBe(foldForMatch('हजार'));
    expect(foldForMatch('फ़रवरी')).toBe(foldForMatch('फरवरी'));
    // Decomposed input (letter + U+093C) folds the same as the precomposed letter.
    expect(foldForMatch('ज़ाम')).toBe(foldForMatch('जाम'));
  });

  it('folds chandrabindu to anusvara', () => {
    expect(foldForMatch('सातवाँ')).toBe(foldForMatch('सातवां'));
  });

  it('turns Devanagari, Bengali, Tamil and full-width digits into ASCII', () => {
    expect(foldForMatch('₹२,५०,०००')).toBe('₹2,50,000');
    expect(foldForMatch('৩০০')).toBe('300');
    expect(foldForMatch('௨௫')).toBe('25');
    expect(foldForMatch('１５')).toBe('15');
  });

  it('leaves digits of scripts outside the supported set as they are', () => {
    expect(foldForMatch('၁၂')).toBe('၁၂');
  });

  it('maps vulgar fractions to decimals and avoids the NFKC trap', () => {
    expect(foldForMatch('1½ Lakh')).toBe('1.5 lakh');
    expect(foldForMatch('½ kg')).toBe('0.5 kg');
    expect(foldForMatch('2¼ and 3¾')).toBe('2.25 and 3.75');
    expect(foldForMatch('1½')).not.toContain('11');
  });

  it('strips accents after Latin letters only and keeps Indic vowel signs', () => {
    expect(foldForMatch('Dīwālī')).toBe('diwali');
    expect(foldForMatch('शादी')).toBe('शादी');
  });

  it('removes joiners, turns dandas into spaces, lowercases and collapses spaces', () => {
    expect(foldForMatch('क्‍ष')).toBe('क्ष');
    expect(foldForMatch('शादी।  मेहमान॥')).toBe('शादी मेहमान');
    expect(foldForMatch('  Jaipur   SHAADI ')).toBe('jaipur shaadi');
  });
});

describe('foldForMatch on the measured spelling traps', () => {
  it('drops the nukta from precomposed letters NFC keeps apart, and from ऩ ऱ ऴ', () => {
    // U+095B (ज़) is a composition exclusion: NFC alone never folds it into ज.
    expect(foldForMatch('\u{95B}')).toBe('\u{91C}');
    // U+0929 (ऩ) survives NFC, so folding must start from NFD.
    expect(foldForMatch('\u{929}')).toBe('\u{928}');
    expect(foldForMatch('\u{931}')).toBe('\u{930}');
    expect(foldForMatch('\u{934}')).toBe('\u{933}');
  });

  it('drops ZWNJ, ZWJ and the soft hyphen', () => {
    expect(foldForMatch('क्\u{200C}ष')).toBe(foldForMatch('क्ष'));
    expect(foldForMatch('क्\u{200D}ष')).toBe(foldForMatch('क्ष'));
    expect(foldForMatch('shaa\u{AD}di')).toBe('shaadi');
  });

  it('reads a vulgar fraction after a Devanagari digit, and Indian grouping', () => {
    expect(foldForMatch('२½ लाख')).toBe('2.5 लाख');
    expect(foldForMatch('२५,००,०००')).toBe('25,00,000');
  });

  it('keeps every Devanagari vowel sign (दिवाली never becomes दवल)', () => {
    expect(foldForMatch('दिवाली Dīwālī')).toBe('दिवाली diwali');
  });

  it('collapses no-break and narrow no-break spaces like any other space', () => {
    expect(foldForMatch('300\u{A0}log\u{202F}Jaipur')).toBe('300 log jaipur');
  });
});

describe('toDisplayText', () => {
  it('composes canonically without folding anything visible', () => {
    expect(toDisplayText('ज़ाम')).toBe('ज़ाम'.normalize('NFC'));
    expect(toDisplayText('1½ Lakh')).toBe('1½ Lakh');
  });
});
