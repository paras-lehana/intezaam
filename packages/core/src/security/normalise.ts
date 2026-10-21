/**
 * Text folding for matching: the one place that decides when two spellings are "the same".
 *
 * Responsibility: `foldForMatch` turns any brief, quote or vocabulary entry into a match key
 * (research note 09 §5.3): NFD → drop the nukta and joiners → drop accents after Latin
 * letters only → NFC → chandrabindu to anusvara → every decimal digit to ASCII → vulgar
 * fractions to decimals → dandas to spaces → lowercase → collapse whitespace. So इंतज़ाम
 * matches इंतजाम, सातवाँ matches सातवां, Dīwālī matches diwali and २५ reads as 25.
 * Boundary: never NFKC (it turns "1½" into "11⁄2"); display text is plain NFC
 * (`toDisplayText`); parsing and the evidence guard both run on the folded key.
 */

const DEVANAGARI_NUKTA = /\u{93C}/gu;
/** ZWNJ, ZWJ and the soft hyphen change rendering, never meaning. */
const JOINERS = /\u{200C}|\u{200D}|\u{AD}/gu;
/** Accents are stripped only after Latin letters: stripping Indic vowel signs destroys words. */
const LATIN_ACCENTS = /(\p{Script=Latin})\p{M}+/gu;
const CHANDRABINDU = /\u{901}/gu;
const ANUSVARA = '\u{902}';
const DECIMAL_DIGIT = /\p{Nd}/gu;
const DANDAS = /[\u{964}\u{965}]/gu;
const WHITESPACE_RUN = /\s+/g;

/**
 * The zero of every decimal-digit block a brief is likely to use: ASCII, Arabic-Indic,
 * Extended Arabic-Indic, the nine Indic scripts of the supported languages, and full width.
 */
const DIGIT_ZEROS: readonly number[] = [
  0x0030, 0x0660, 0x06f0, 0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66,
  0xff10,
];
const DIGITS_PER_BLOCK = 10;

/** ½ ¼ ¾ as decimals; a leading digit keeps its place ("1½" → "1.5"), a lone one gains a 0. */
const VULGAR_FRACTIONS: readonly (readonly [RegExp, string])[] = [
  [/(\d?)½/g, '.5'],
  [/(\d?)¼/g, '.25'],
  [/(\d?)¾/g, '.75'],
];

function asciiDigit(char: string): string {
  const codePoint = char.codePointAt(0) ?? 0;
  const zero = DIGIT_ZEROS.find(
    (blockZero) => codePoint >= blockZero && codePoint < blockZero + DIGITS_PER_BLOCK,
  );
  return zero === undefined ? char : String(codePoint - zero);
}

function decimalFractions(text: string): string {
  return VULGAR_FRACTIONS.reduce(
    (current, [pattern, decimal]) =>
      current.replace(
        pattern,
        (_match, whole: string) => `${whole === '' ? '0' : whole}${decimal}`,
      ),
    text,
  );
}

/**
 * Display form: canonical composition only, so precomposed and decomposed input look and
 * compare the same without losing any visible character.
 * @example
 * toDisplayText('इंतज\u{93C}ाम') === toDisplayText('इंतज़ाम'); // true (decomposed vs precomposed)
 */
export function toDisplayText(text: string): string {
  return text.normalize('NFC');
}

/**
 * The match key for parsing and evidence checks (research note 09 §5.3, steps a–k).
 * @example
 * foldForMatch('इंतज़ाम') === foldForMatch('इंतजाम'); // true
 * foldForMatch('₹२,५०,०००'); // '₹2,50,000'
 * foldForMatch('1½ Lakh'); // '1.5 lakh'
 */
export function foldForMatch(text: string): string {
  const digits = text
    .normalize('NFD')
    .replace(DEVANAGARI_NUKTA, '')
    .replace(JOINERS, '')
    .replace(LATIN_ACCENTS, '$1')
    .normalize('NFC')
    .replace(CHANDRABINDU, ANUSVARA)
    .replace(DECIMAL_DIGIT, asciiDigit);
  return decimalFractions(digits)
    .replace(DANDAS, ' ')
    .toLowerCase()
    .replace(WHITESPACE_RUN, ' ')
    .trim();
}
