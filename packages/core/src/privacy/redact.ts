/**
 * PII redaction for Indian identifiers.
 *
 * Responsibility: replace Aadhaar, PAN, phone, email, IFSC, UPI, card and bank
 * account numbers with typed placeholders before any text is analysed, cached or
 * sent to a model. Boundary: pattern-based and deliberately conservative. Every Unicode
 * decimal digit is folded to ASCII first, so the redacted text (what every quote and span
 * refers to afterwards) carries ASCII digits; the evidence guards fold both sides the same way.
 */
import { REDACTION_TYPES, type RedactionCount, type RedactionType } from '../schemas/privacy.js';

/**
 * A decimal digit outside ASCII: Devanagari ९, Bengali ৯, Tamil ௯, Thai ๙, full-width ９,
 * mathematical bold 𝟗 and the rest of `\p{Nd}`. Every pattern below uses `\d`, which without
 * the `u` flag is only [0-9], so a phone typed as "९८७६५४३२१०" or "𝟗𝟖𝟕𝟔𝟓𝟒𝟑𝟐𝟏𝟎" would otherwise
 * reach the model untouched.
 */
const NON_ASCII_DIGIT = /(?![0-9])\p{Nd}/gu;
const ONE_DIGIT = /^\p{Nd}$/u;

/**
 * Unicode encodes every decimal digit in contiguous runs of ten, 0 to 9 in order (a Unicode
 * stability policy), so a digit's value is its distance from the start of its run, modulo
 * ten. Runs can sit back to back: the longest is the five mathematical digit sets,
 * U+1D7CE–U+1D7FF, fifty code points long, which bounds the walk back.
 */
const DIGITS_PER_RUN = 10;
const LONGEST_DIGIT_RUN = 50;

/** Card numbers are 13–19 digits (ISO/IEC 7812); spaces or dashes may separate groups. */
const CARD_PATTERN = /\b\d(?:[ -]?\d){12,18}\b/g;
const CARD_MIN_DIGITS = 13;
const CARD_MAX_DIGITS = 19;

/** Aadhaar: 12 digits, first digit 2–9 (UIDAI never issues 0 or 1), optional 4-4-4 spacing. */
const AADHAAR_PATTERN = /\b[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}\b/g;

const EMAIL_PATTERN = /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g;

/** UPI handles have no dot after the @ (name@okaxis); real emails were already replaced. */
const UPI_PATTERN = /\b[\w.-]{2,64}@[a-zA-Z]{2,32}\b/g;

/** PAN: 5 letters, 4 digits, 1 letter (Income Tax Department format). */
const PAN_PATTERN = /\b[A-Z]{5}\d{4}[A-Z]\b/g;

/** IFSC: 4-letter bank code, a literal 0, then a 6-character branch code (RBI format). */
const IFSC_PATTERN = /\b[A-Z]{4}0[A-Z0-9]{6}\b/g;

/**
 * Indian mobiles start with 6–9 and have 10 digits; +91 or a leading 0 is optional. The
 * word boundary belongs to the bare form only: "\b0\b9…" can never match, so a separate
 * boundary after the 0 would let "09876543210" through unredacted.
 */
const PHONE_PATTERN = /(?:\+91[\s-]?|\b0|\b)[6-9]\d{4}[\s-]?\d{5}\b/g;

/** Bank accounts are 9–18 digits; only redacted near an account keyword to avoid eating amounts. */
const BANK_ACCOUNT_PATTERN =
  /\b(a\/c|account|acct)(\.?\s*(?:no\.?|number|#)?\s*[:.-]?\s*)(\d{9,18})\b/gi;

const PLACEHOLDER: Readonly<Record<RedactionType, string>> = {
  aadhaar: '[AADHAAR]',
  pan: '[PAN]',
  phone: '[PHONE]',
  email: '[EMAIL]',
  'bank-account': '[BANK_ACCOUNT]',
  ifsc: '[IFSC]',
  upi: '[UPI]',
  card: '[CARD]',
};

const LUHN_DOUBLE_THRESHOLD = 9;
const DECIMAL_RADIX = 10;

/**
 * Luhn checksum — separates real card numbers from other long digit runs.
 * @example
 * passesLuhn('4111111111111111'); // true
 */
export function passesLuhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number.parseInt(digits.charAt(index), DECIMAL_RADIX);
    if (double) {
      digit *= 2;
      if (digit > LUHN_DOUBLE_THRESHOLD) digit -= LUHN_DOUBLE_THRESHOLD;
    }
    sum += digit;
    double = !double;
  }
  return sum % DECIMAL_RADIX === 0;
}

function isCardNumber(match: string): boolean {
  const digits = match.replace(/\D/g, '');
  return digits.length >= CARD_MIN_DIGITS && digits.length <= CARD_MAX_DIGITS && passesLuhn(digits);
}

/**
 * The ASCII spelling of one decimal digit from any script.
 * @example
 * asciiDigit('९'); // '9'
 * asciiDigit('𝟗'); // '9'
 */
function asciiDigit(digit: string): string {
  const codePoint = digit.codePointAt(0) ?? 0;
  let offset = 0;
  while (
    offset < LONGEST_DIGIT_RUN &&
    ONE_DIGIT.test(String.fromCodePoint(codePoint - offset - 1))
  ) {
    offset += 1;
  }
  return String(offset % DIGITS_PER_RUN);
}

/**
 * Spells every decimal digit in ASCII so one set of patterns covers every script a family
 * types in, and every look-alike digit set a person might use to slip a number past them.
 * The lambda passes the digit alone, never `replace`'s offset and input arguments.
 */
function asciiDigits(text: string): string {
  // Efficiency: one linear scan; the run walk (at most fifty steps) happens once per
  // non-ASCII digit, so an all-ASCII brief pays for that scan only.
  return text.replace(NON_ASCII_DIGIT, (digit) => asciiDigit(digit));
}

export interface RedactionResult {
  readonly text: string;
  readonly redactions: RedactionCount[];
}

/**
 * Replaces Indian PII with typed placeholders and counts what was removed.
 * Digits from every script are folded to ASCII first; then order matters: cards and Aadhaar go
 * before accounts, emails before UPI handles.
 * @example
 * redactPii('Call 9876543210').text; // 'Call [PHONE]'
 * redactPii('मेरा नंबर ९८७६५४३२१० है').text; // 'मेरा नंबर [PHONE] है'
 * redactPii('₹२५ लाख').text; // '₹25 लाख' (amounts survive, spelt in ASCII)
 */
export function redactPii(text: string): RedactionResult {
  const counts = new Map<RedactionType, number>();
  const bump = (type: RedactionType): string => {
    counts.set(type, (counts.get(type) ?? 0) + 1);
    return PLACEHOLDER[type];
  };
  const simple = (input: string, pattern: RegExp, type: RedactionType): string =>
    input.replace(pattern, () => bump(type));

  let out = asciiDigits(text).replace(CARD_PATTERN, (match) =>
    isCardNumber(match) ? bump('card') : match,
  );
  out = simple(out, AADHAAR_PATTERN, 'aadhaar');
  out = simple(out, EMAIL_PATTERN, 'email');
  out = simple(out, UPI_PATTERN, 'upi');
  out = simple(out, PAN_PATTERN, 'pan');
  out = simple(out, IFSC_PATTERN, 'ifsc');
  out = simple(out, PHONE_PATTERN, 'phone');
  out = out.replace(
    BANK_ACCOUNT_PATTERN,
    (_match, keyword: string, separator: string) => `${keyword}${separator}${bump('bank-account')}`,
  );

  const redactions = REDACTION_TYPES.flatMap((type) => {
    const count = counts.get(type) ?? 0;
    return count > 0 ? [{ type, count }] : [];
  });
  return { text: out, redactions };
}
