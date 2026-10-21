/**
 * Tests for the pure UTF-8 and base64 codecs behind the share link and the quote-file check.
 *
 * Responsibility: compare every result with Node's Buffer (an independent oracle), and prove
 * that malformed input is refused rather than half-decoded. Boundary: pure.
 */
import { describe, expect, it } from 'vitest';
import {
  base64DecodedLength,
  base64HeaderBytes,
  base64ToBytes,
  bytesToBase64Url,
  utf8Bytes,
  utf8Text,
} from '../security/base64.js';

const SAMPLES = ['', 'a', 'ab', 'abc', '₹25 लाख', 'इंतज़ाम 🎉', 'शादी, 300 guests'];

describe('utf8Bytes and utf8Text', () => {
  it('match Buffer for ASCII, Devanagari and emoji', () => {
    for (const text of SAMPLES) {
      const bytes = utf8Bytes(text);
      expect(bytes).toEqual([...Buffer.from(text, 'utf8')]);
      expect(utf8Text(bytes)).toBe(text);
    }
  });

  it('encodes a lone surrogate as the replacement character', () => {
    expect(utf8Bytes('\uD800')).toEqual([...Buffer.from('�', 'utf8')]);
  });

  it('refuses invalid UTF-8 (bad lead byte, truncation, overlong form)', () => {
    expect(utf8Text([0xff])).toBeUndefined();
    expect(utf8Text([0xe2, 0x82])).toBeUndefined();
    expect(utf8Text([0xc0, 0xaf])).toBeUndefined();
  });
});

describe('bytesToBase64Url and base64ToBytes', () => {
  it('encode like Buffer base64url and round-trip', () => {
    for (const text of SAMPLES) {
      const bytes = [...Buffer.from(text, 'utf8')];
      const encoded = bytesToBase64Url(bytes);
      expect(encoded).toBe(Buffer.from(text, 'utf8').toString('base64url'));
      expect(base64ToBytes(encoded)).toEqual(bytes);
    }
  });

  it('decode standard padded base64 as well', () => {
    const bytes = [0xfb, 0xff, 0x00, 0x10];
    expect(base64ToBytes(Buffer.from(bytes).toString('base64'))).toEqual(bytes);
  });

  it('refuse characters outside the alphabet and impossible lengths', () => {
    expect(base64ToBytes('a$b')).toBeUndefined();
    expect(base64ToBytes('abcde')).toBeUndefined();
  });
});

describe('base64HeaderBytes and base64DecodedLength', () => {
  const pdf = Buffer.from('%PDF-1.7\n% sample quote body').toString('base64');

  it('decode only the leading bytes', () => {
    expect(base64HeaderBytes(pdf, 4)).toEqual([0x25, 0x50, 0x44, 0x46]);
    expect(base64HeaderBytes('a$bc', 3)).toBeUndefined();
  });

  it('compute the decoded size without decoding', () => {
    for (const text of SAMPLES) {
      const encoded = Buffer.from(text, 'utf8').toString('base64');
      expect(base64DecodedLength(encoded)).toBe(Buffer.byteLength(text, 'utf8'));
    }
  });
});
