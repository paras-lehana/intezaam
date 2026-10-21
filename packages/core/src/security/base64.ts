/**
 * UTF-8 and base64 codecs that run identically in the browser and on the server.
 *
 * Responsibility: encode text to UTF-8 bytes and back, and bytes to base64 / base64url and
 * back, without Buffer, atob, btoa or TextEncoder (core has no DOM or Node types). Used by
 * the share-link codec and the quote-file signature check.
 * Boundary: pure; decoding never throws — invalid input returns undefined.
 */

const STANDARD_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Both alphabets decode, so a link that went through either encoder still opens. */
const DECODE_TABLE: ReadonlyMap<string, number> = new Map([
  ...Array.from(STANDARD_ALPHABET, (char, index) => [char, index] as const),
  ...Array.from(URL_ALPHABET, (char, index) => [char, index] as const),
]);

const BITS_PER_CHAR = 6;
const BITS_PER_BYTE = 8;
/** Three bytes are exactly four base64 characters: 24 bits. */
const GROUP_BITS = 24;
const GROUP_MASK = 0xffffff;
const BYTE_MASK = 0xff;
const SIX_BIT_MASK = 0x3f;
const BYTES_PER_GROUP = 3;
const CHARS_PER_GROUP = 4;
const PADDING = /=+$/;

/** UTF-8: lead-byte prefixes, the code-point limits of 1-, 2- and 3-byte sequences, 6 payload bits per continuation byte. */
const ONE_BYTE_MAX = 0x7f;
const TWO_BYTE_MAX = 0x7ff;
const THREE_BYTE_MAX = 0xffff;
const TWO_BYTE_LEAD = 0xc0;
const THREE_BYTE_LEAD = 0xe0;
const FOUR_BYTE_LEAD = 0xf0;
const CONTINUATION = 0x80;
const CONTINUATION_BITS = 6;
const SURROGATE_LOW = 0xd800;
const SURROGATE_HIGH = 0xdfff;
const REPLACEMENT_CHARACTER = 0xfffd;
const HEX_RADIX = 16;
const HEX_WIDTH = 2;

/** The continuation byte carrying payload group `index` (0 = the lowest six bits). */
function continuation(codePoint: number, index: number): number {
  return CONTINUATION | ((codePoint >> (CONTINUATION_BITS * index)) & SIX_BIT_MASK);
}

/**
 * UTF-8 bytes of a string; a lone surrogate is encoded as U+FFFD instead of failing.
 * @example
 * utf8Bytes('₹'); // [0xe2, 0x82, 0xb9]
 */
export function utf8Bytes(text: string): number[] {
  const bytes: number[] = [];
  for (const char of text) {
    const raw = char.codePointAt(0) ?? 0;
    const codePoint = raw >= SURROGATE_LOW && raw <= SURROGATE_HIGH ? REPLACEMENT_CHARACTER : raw;
    if (codePoint <= ONE_BYTE_MAX) bytes.push(codePoint);
    else if (codePoint <= TWO_BYTE_MAX) {
      bytes.push(TWO_BYTE_LEAD | (codePoint >> CONTINUATION_BITS), continuation(codePoint, 0));
    } else if (codePoint <= THREE_BYTE_MAX) {
      bytes.push(
        THREE_BYTE_LEAD | (codePoint >> (CONTINUATION_BITS * 2)),
        continuation(codePoint, 1),
        continuation(codePoint, 0),
      );
    } else {
      bytes.push(
        FOUR_BYTE_LEAD | (codePoint >> (CONTINUATION_BITS * 3)),
        continuation(codePoint, 2),
        continuation(codePoint, 1),
        continuation(codePoint, 0),
      );
    }
  }
  return bytes;
}

/**
 * Decodes UTF-8 bytes; undefined when the bytes are not valid UTF-8.
 * @example
 * utf8Text([0xe2, 0x82, 0xb9]); // '₹'
 * utf8Text([0xff]); // undefined
 */
export function utf8Text(bytes: readonly number[]): string | undefined {
  // Percent-decoding validates UTF-8 strictly (overlongs, surrogates, truncation).
  const escaped = bytes
    .map((byte) => `%${(byte & BYTE_MASK).toString(HEX_RADIX).padStart(HEX_WIDTH, '0')}`)
    .join('');
  try {
    return decodeURIComponent(escaped);
  } catch {
    return undefined;
  }
}

/**
 * Base64url (RFC 4648 §5) without padding, safe inside a URL fragment.
 * @example
 * bytesToBase64Url([0xfb, 0xff]); // '-_8'
 */
export function bytesToBase64Url(bytes: readonly number[]): string {
  let out = '';
  for (let index = 0; index < bytes.length; index += BYTES_PER_GROUP) {
    const group = bytes.slice(index, index + BYTES_PER_GROUP);
    const value = group.reduce(
      (acc, byte, position) =>
        acc | ((byte & BYTE_MASK) << (GROUP_BITS - BITS_PER_BYTE * (position + 1))),
      0,
    );
    // Unpadded: 1 byte → 2 chars, 2 bytes → 3 chars, 3 bytes → 4 chars.
    const chars = Math.ceil((group.length * BITS_PER_BYTE) / BITS_PER_CHAR);
    for (let charIndex = 0; charIndex < chars; charIndex += 1) {
      const shift = GROUP_BITS - BITS_PER_CHAR * (charIndex + 1);
      out += URL_ALPHABET.charAt((value >> shift) & SIX_BIT_MASK);
    }
  }
  return out;
}

/** Decodes base64 characters (either alphabet, no padding); undefined on a foreign character. */
function decodeChars(body: string): number[] | undefined {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of body) {
    const value = DECODE_TABLE.get(char);
    if (value === undefined) return undefined;
    buffer = ((buffer << BITS_PER_CHAR) | value) & GROUP_MASK;
    bits += BITS_PER_CHAR;
    if (bits >= BITS_PER_BYTE) {
      bits -= BITS_PER_BYTE;
      bytes.push((buffer >> bits) & BYTE_MASK);
    }
  }
  return bytes;
}

/**
 * Decodes base64 or base64url (padding optional); undefined on any invalid character or an
 * impossible length.
 * @example
 * base64ToBytes('JVBERi0'); // [0x25, 0x50, 0x44, 0x46, 0x2d] ("%PDF-")
 * base64ToBytes('a$b'); // undefined
 */
export function base64ToBytes(text: string): number[] | undefined {
  const body = text.replace(PADDING, '');
  // One leftover character carries only 6 bits, so no valid encoder produces it.
  if (body.length % CHARS_PER_GROUP === 1) return undefined;
  return decodeChars(body);
}

/**
 * The first `byteCount` bytes of a base64 string, decoding only the characters needed.
 * @example
 * base64HeaderBytes('JVBERi0xLjQK', 4); // [0x25, 0x50, 0x44, 0x46]
 */
export function base64HeaderBytes(text: string, byteCount: number): number[] | undefined {
  // Efficiency: a 2 MiB upload is checked by decoding 16 characters, not 2.8 million.
  const chars = Math.ceil(byteCount / BYTES_PER_GROUP) * CHARS_PER_GROUP;
  return decodeChars(text.replace(PADDING, '').slice(0, chars))?.slice(0, byteCount);
}

/**
 * Decoded size of a base64 string without decoding it.
 * @example
 * base64DecodedLength('JVBERi0='); // 5
 */
export function base64DecodedLength(text: string): number {
  const body = text.replace(PADDING, '');
  return Math.floor((body.length * BITS_PER_CHAR) / BITS_PER_BYTE);
}
