/**
 * Tests for schemas/quote-read.ts: the shared contract of POST /api/quotes/read.
 *
 * Responsibility: pin that a request carries exactly one file whose bytes match its declared
 * type, and that a response is an editable transcript with redaction counts and provenance.
 * Boundary: file bytes are built here from each format's published signature.
 */
import { describe, expect, it } from 'vitest';
import { OFFLINE_REASONS } from '../schemas/provenance.js';
import { quoteReadRequestSchema, quoteReadResponseSchema } from '../schemas/quote-read.js';

/** The eight-byte PNG signature, then filler, as base64. */
const PNG_BASE64 = Buffer.from([
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a,
  ...new Array<number>(32).fill(0),
]).toString('base64');
const TEXT_BASE64 = Buffer.from('This is not a PDF, just text pretending to be one.').toString(
  'base64',
);

describe('quoteReadRequestSchema', () => {
  it('accepts one file whose bytes match its type', () => {
    const request = {
      file: { mimeType: 'image/png', fileName: 'quote.png', dataBase64: PNG_BASE64 },
    };
    expect(quoteReadRequestSchema.safeParse(request).success).toBe(true);
  });

  it('refuses a file pretending to be a PDF, and any extra key', () => {
    const fake = {
      file: { mimeType: 'application/pdf', fileName: 'quote.pdf', dataBase64: TEXT_BASE64 },
    };
    expect(quoteReadRequestSchema.safeParse(fake).success).toBe(false);
    const extra = {
      file: { mimeType: 'image/png', fileName: 'quote.png', dataBase64: PNG_BASE64 },
      todayIso: '2026-10-20',
    };
    expect(quoteReadRequestSchema.safeParse(extra).success).toBe(false);
  });
});

describe('quoteReadResponseSchema', () => {
  it('accepts a transcript with redactions and an offline provenance that says why', () => {
    for (const reason of OFFLINE_REASONS) {
      const response = {
        text: 'Veg buffet Rs 950 per plate, GST extra',
        redactions: [{ type: 'phone', count: 1 }],
        provenance: { mode: 'offline', reason, models: [], latencyMs: 0, steps: [] },
      };
      expect(quoteReadResponseSchema.safeParse(response).success).toBe(true);
    }
  });

  it('refuses an empty transcript', () => {
    const empty = {
      text: '',
      redactions: [],
      provenance: { mode: 'offline', models: [], latencyMs: 0, steps: [] },
    };
    expect(quoteReadResponseSchema.safeParse(empty).success).toBe(false);
  });
});
