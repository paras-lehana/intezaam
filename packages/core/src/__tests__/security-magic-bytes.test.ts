/**
 * Tests for the quote-file contract: magic bytes decide the type, never the file name or
 * the declared MIME type (09-gap-fills Gap 4 §4.2).
 *
 * Responsibility: each published signature is recognised, a mismatch or a disguised file
 * (SVG, HTML, EXE) is refused with a fixed message that never echoes input, and size and
 * alphabet limits hold. Fixtures are built with Buffer from the signatures themselves.
 * Boundary: pure.
 */
import { describe, expect, it } from 'vitest';
import {
  matchesFileSignature,
  MAX_QUOTE_FILE_BASE64_CHARS,
  MAX_QUOTE_FILE_BYTES,
  QUOTE_FILE_MISMATCH_MESSAGE,
  QUOTE_FILE_TOO_LARGE_MESSAGE,
  QUOTE_FILE_TYPES,
  quoteFileSchema,
  sniffFileType,
  type QuoteFileType,
} from '../security/magic-bytes.js';

/** Header bytes per type, padded with a body so every sample is longer than the minimum. */
const HEADERS: Readonly<Record<QuoteFileType, readonly number[]>> = {
  'application/pdf': [...Buffer.from('%PDF-1.7\n')],
  'image/jpeg': [0xff, 0xd8, 0xff, 0xe0],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/webp': [...Buffer.from('RIFF'), 0x24, 0x00, 0x00, 0x00, ...Buffer.from('WEBPVP8 ')],
};

function sample(header: readonly number[]): string {
  return Buffer.from([
    ...header,
    ...Buffer.from('quote body for a caterer, veg per plate'),
  ]).toString('base64');
}

describe('sniffFileType', () => {
  it('recognises every published signature', () => {
    for (const type of QUOTE_FILE_TYPES) {
      expect(sniffFileType(sample(HEADERS[type]))).toBe(type);
      expect(matchesFileSignature(type, sample(HEADERS[type]))).toBe(true);
    }
  });

  it('refuses SVG, HTML, executables and a RIFF that is not WebP', () => {
    const disguised = [
      '<svg xmlns="http://www.w3.org/2000/svg">',
      '<html><script>',
      'MZ\u0090\u0000 program',
    ];
    for (const text of disguised)
      expect(sniffFileType(Buffer.from(text).toString('base64'))).toBeUndefined();
    const wave = [...Buffer.from('RIFF'), 0x24, 0, 0, 0, ...Buffer.from('WAVEfmt ')];
    expect(sniffFileType(sample(wave))).toBeUndefined();
    expect(sniffFileType('$$$$')).toBeUndefined();
  });

  it('says a PNG declared to be a JPEG does not match', () => {
    expect(matchesFileSignature('image/jpeg', sample(HEADERS['image/png']))).toBe(false);
  });
});

describe('quoteFileSchema', () => {
  it('accepts a real PDF with a matching type', () => {
    const file = {
      mimeType: 'application/pdf',
      fileName: 'quote.pdf',
      dataBase64: sample(HEADERS['application/pdf']),
    };
    expect(quoteFileSchema.safeParse(file).success).toBe(true);
  });

  it('refuses a mismatch with the fixed message and never echoes the file name', () => {
    const file = {
      mimeType: 'image/png',
      fileName: 'evil<script>.png',
      dataBase64: sample(HEADERS['image/jpeg']),
    };
    const result = quoteFileSchema.safeParse(file);
    expect(result.success).toBe(false);
    const messages = result.error?.issues.map((issue) => issue.message) ?? [];
    expect(messages).toContain(QUOTE_FILE_MISMATCH_MESSAGE);
    expect(messages.join(' ')).not.toContain('evil');
  });

  it('refuses url-safe or whitespace base64, unknown types and extra keys', () => {
    const good = sample(HEADERS['image/png']);
    const base = { mimeType: 'image/png', fileName: 'a.png', dataBase64: good };
    expect(
      quoteFileSchema.safeParse({ ...base, dataBase64: `${good.slice(0, 20)} ${good.slice(20)}` })
        .success,
    ).toBe(false);
    expect(
      quoteFileSchema.safeParse({
        ...base,
        dataBase64: good.replace(/\+/g, '-').replace(/\//g, '_') + '-_',
      }).success,
    ).toBe(false);
    expect(quoteFileSchema.safeParse({ ...base, mimeType: 'image/svg+xml' }).success).toBe(false);
    expect(quoteFileSchema.safeParse({ ...base, extra: true }).success).toBe(false);
  });

  it('refuses a file over the size limit with the size message', () => {
    expect(MAX_QUOTE_FILE_BASE64_CHARS).toBe(Math.ceil(MAX_QUOTE_FILE_BYTES / 3) * 4);
    const header = Buffer.from(HEADERS['image/jpeg']).toString('base64').slice(0, 4);
    const oversized = header.padEnd(MAX_QUOTE_FILE_BASE64_CHARS, 'A');
    const result = quoteFileSchema.safeParse({
      mimeType: 'image/jpeg',
      fileName: 'big.jpg',
      dataBase64: oversized,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toContain(
      QUOTE_FILE_TOO_LARGE_MESSAGE,
    );
  });
});
