/**
 * Tests for PII redaction before any model call (phones, emails, UPI, bank details,
 * Aadhaar, PAN, IFSC, cards).
 *
 * Responsibility: each identifier becomes its typed placeholder and is counted, whether its
 * digits are ASCII, Indic, Thai, full width or a mathematical look-alike set; amounts, guest
 * counts and dates in a brief survive. Boundary: pure.
 */
import { describe, expect, it } from 'vitest';
import { passesLuhn, redactPii } from '../privacy/redact.js';
import { foldForMatch } from '../security/normalise.js';

describe('redactPii', () => {
  it('redacts Indian mobile numbers in every common form', () => {
    for (const phone of ['9876543210', '+91 98765 43210', '+91-9876543210', '09876543210']) {
      expect(redactPii(`call ${phone} now`).text).toBe('call [PHONE] now');
    }
  });

  it('redacts emails before UPI handles so each gets its own placeholder', () => {
    const result = redactPii('mail riya@example.com or pay riya@okaxis');
    expect(result.text).toBe('mail [EMAIL] or pay [UPI]');
    expect(result.redactions).toEqual([
      { type: 'email', count: 1 },
      { type: 'upi', count: 1 },
    ]);
  });

  it('redacts Aadhaar, PAN and IFSC', () => {
    expect(redactPii('Aadhaar 2345 6789 0123').text).toBe('Aadhaar [AADHAAR]');
    expect(redactPii('PAN ABCDE1234F').text).toBe('PAN [PAN]');
    expect(redactPii('IFSC HDFC0001234').text).toBe('IFSC [IFSC]');
  });

  it('redacts a bank account only next to an account keyword', () => {
    expect(redactPii('A/C no: 123456789012 at the bank').text).toBe(
      'A/C no: [BANK_ACCOUNT] at the bank',
    );
    expect(redactPii('Total 123456789 rupees').text).toBe('Total 123456789 rupees');
  });

  it('redacts a card number only when the Luhn check passes', () => {
    expect(redactPii('card 4111 1111 1111 1111').text).toBe('card [CARD]');
    expect(redactPii('ref 4111 1111 1111 1112').text).not.toContain('[CARD]');
  });

  it('keeps amounts, guest counts and dates that a plan needs', () => {
    const brief = 'Budget ₹25,00,000 for 300 guests on 25 Nov 2026, 1.5 lakh advance';
    expect(redactPii(brief)).toEqual({ text: brief, redactions: [] });
  });

  it('counts repeated identifiers of one type together', () => {
    const result = redactPii('9876543210 or 9123456789');
    expect(result.redactions).toEqual([{ type: 'phone', count: 2 }]);
  });
});

/** The zero of each digit block a family is likely to type in (Unicode code charts). */
const DIGIT_ZEROS = {
  devanagari: 0x0966,
  bengali: 0x09e6,
  tamil: 0x0be6,
  thai: 0x0e50,
  fullWidth: 0xff10,
  mathBold: 0x1d7ce,
  mathMonospace: 0x1d7f6,
} as const;

/** Unicode's highest code point; the sweep below covers every assigned decimal digit. */
const MAX_CODE_POINT = 0x10ffff;
const ONE_DIGIT = /^\p{Nd}$/u;
const NON_ASCII_DIGITS = Array.from({ length: MAX_CODE_POINT + 1 }, (_unused, codePoint) =>
  String.fromCodePoint(codePoint),
).filter((char) => ONE_DIGIT.test(char) && !/[0-9]/.test(char));

/** ASCII samples the redactor already catches; each is re-spelt in every block above. */
const ASCII_SAMPLES = [
  'mera number 9876543210 hai',
  'call +91 98765 43210',
  'aadhaar 2345 6789 0123',
  'PAN ABCDE1234F',
  'IFSC HDFC0001234',
  'card 4111 1111 1111 1111',
  'A/C no: 123456789012 at the bank',
] as const;

/** Re-spells ASCII digits in the decimal-digit block whose zero is given. */
function respell(ascii: string, zero: number): string {
  return ascii.replace(/[0-9]/g, (digit) => String.fromCodePoint(zero + Number(digit)));
}

describe('redactPii with digits outside ASCII', () => {
  it('redacts the reported Devanagari and full-width probes', () => {
    expect(redactPii('mera number ९८७६५४३२१० hai').text).toBe('mera number [PHONE] hai');
    expect(redactPii('aadhaar २३४५ ६७८९ ०१२३').text).toBe('aadhaar [AADHAAR]');
    expect(redactPii('call ９８７６５４３２１０').text).toBe('call [PHONE]');
    expect(redactPii('PAN ABCDE१२३४F').text).toBe('PAN [PAN]');
    expect(redactPii('मेरा नंबर ९८७६५४३२१० है').text).toBe('मेरा नंबर [PHONE] है');
  });

  for (const [script, zero] of Object.entries(DIGIT_ZEROS)) {
    it(`redacts ${script} digits exactly as their ASCII spelling`, () => {
      for (const sample of ASCII_SAMPLES) {
        const ascii = redactPii(sample);
        // Guards the comparison: an unredacted ASCII sample would make equality meaningless.
        expect(ascii.redactions).not.toEqual([]);
        expect(redactPii(respell(sample, zero))).toEqual(ascii);
      }
    });
  }

  it('spells every Unicode decimal digit as the ASCII digit the normaliser reads it as', () => {
    // Guards the sweep: Unicode has well over 600 decimal digits outside ASCII.
    expect(NON_ASCII_DIGITS.length).toBeGreaterThan(600);
    for (const digit of NON_ASCII_DIGITS) {
      const spelt = redactPii(digit).text;
      expect(spelt).toMatch(/^[0-9]$/);
      // foldForMatch knows the Indic, Arabic and full-width blocks: an independent oracle there.
      const folded = foldForMatch(digit);
      if (folded !== digit) expect(spelt).toBe(folded);
    }
  });

  it('keeps amounts and counts typed in Devanagari, spelt in ASCII', () => {
    const brief = 'बजट ₹25,00,000, 300 मेहमान, 25 नवंबर 2026';
    expect(redactPii(respell(brief, DIGIT_ZEROS.devanagari))).toEqual({
      text: brief,
      redactions: [],
    });
  });
});

describe('passesLuhn', () => {
  it('accepts the published test card number and rejects a changed digit', () => {
    expect(passesLuhn('4111111111111111')).toBe(true);
    expect(passesLuhn('4111111111111112')).toBe(false);
    expect(passesLuhn('79927398713')).toBe(true);
  });
});
