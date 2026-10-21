/**
 * Tests for POST /api/quotes/compare (GenAI job 3) and POST /api/quotes/read (job 3a).
 *
 * Responsibility: prove pasted quotes are redacted before the model, code normalises every
 * amount and drops recommendation language, and quote files are proven by magic bytes, capped
 * by size and PDF pages, sent as uploaded without their name, transcribed, with the transcript
 * redacted and cached — with the paste hint when no model
 * answers. Boundary: supertest with a scripted model; expectations derived from core.
 */
import {
  MAX_QUOTE_CHARS,
  QUOTE_FILE_MISMATCH_MESSAGE,
  buildPlan,
  compareQuotesOffline,
  normaliseQuotes,
  quoteReadResponseSchema,
  quotesResponseSchema,
} from '@intezaam/core';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { AI_REQUESTS_PER_MINUTE, FILE_READS_PER_MINUTE } from '../server.js';
import { NO_TEXT_MESSAGE, PASTE_HINT, PDF_PAGES_MESSAGE } from '../services/quote-read-service.js';
import { cleanUserText } from '../services/service-kit.js';
import { TODAY, makeApp, replyWith, weddingContext } from './helpers.js';

const context = weddingContext();
const built = buildPlan(context, TODAY);
if (!built.ok) throw new Error('the sample wedding must plan');
const plan = built.value;

const RAW_QUOTES = [
  { id: 'q1', text: 'Veg thali ₹1,200 per plate + GST. Advance 50%. Call 9876543210.' },
  { id: 'q2', text: 'Package ₹3,50,000 for 300 guests, GST included. Valid till 30 Nov.' },
];
const SEEN = RAW_QUOTES.map((quote) => ({
  id: quote.id,
  text: cleanUserText(quote.text, MAX_QUOTE_CHARS).text,
}));
const OFFLINE_READING = compareQuotesOffline(SEEN, 'caterer');
const compareBody = { context, todayIso: TODAY, category: 'caterer', quotes: RAW_QUOTES };

describe('POST /api/quotes/compare', () => {
  it('compares offline with code-normalised totals', async () => {
    const res = await request(makeApp().app).post('/api/quotes/compare').send(compareBody);
    expect(res.status).toBe(200);
    const parsed = quotesResponseSchema.parse(res.body);
    expect(parsed).toMatchObject(
      JSON.parse(JSON.stringify(normaliseQuotes(OFFLINE_READING, SEEN, 'caterer', plan))),
    );
    expect(parsed.provenance.mode).toBe('offline');
  });

  it('redacts before the model, drops recommendations and caches the reading', async () => {
    const reply = {
      ...OFFLINE_READING,
      differences: [
        ...OFFLINE_READING.differences,
        'We recommend q1: it is the best value for money.',
      ],
    };
    const { app, calls } = makeApp({ script: replyWith(reply) });
    const res = await request(app).post('/api/quotes/compare').send(compareBody);
    const parsed = quotesResponseSchema.parse(res.body);
    expect(calls[0]?.prompt).toContain('[PHONE]');
    expect(calls[0]?.prompt).not.toContain('9876543210');
    expect(parsed.differences.join(' ')).not.toMatch(/recommend|best/i);
    expect(parsed.normalised).toEqual(
      JSON.parse(JSON.stringify(normaliseQuotes(reply, SEEN, 'caterer', plan).normalised)),
    );
    expect(parsed.provenance.mode).toBe('gemini');

    const again = await request(app).post('/api/quotes/compare').send(compareBody);
    expect(calls).toHaveLength(1);
    expect(again.body.provenance.steps.map((step: { name: string }) => step.name)).toContain(
      'cache-hit',
    );
  });
});

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_BASE64 = Buffer.concat([PNG_SIGNATURE, Buffer.alloc(24, 1)]).toString('base64');

function pdfBase64(pages: number): string {
  const objects = Array.from(
    { length: pages },
    (_, index) => `${index + 3} 0 obj << /Type /Page >> endobj`,
  );
  return Buffer.from(
    ['%PDF-1.4', `2 0 obj << /Type /Pages /Count ${pages} >> endobj`, ...objects, '%%EOF'].join(
      '\n',
    ),
  ).toString('base64');
}

function readBody(mimeType: string, dataBase64: string): Record<string, unknown> {
  return { file: { mimeType, fileName: 'quote-from-vendor.png', dataBase64 } };
}

/** Over 3 MiB of JSON. */
const OVERSIZE_BASE64_CHARS = 3_200_000;

describe('POST /api/quotes/read', () => {
  it('sends the proven image as uploaded (never its name), redacts the transcript and caches by file', async () => {
    const { app, calls } = makeApp({
      script: () => Promise.resolve('Veg thali ₹1,200 per plate\nCall 9876543210'),
    });
    const res = await request(app).post('/api/quotes/read').send(readBody('image/png', PNG_BASE64));
    expect(res.status).toBe(200);
    const parsed = quoteReadResponseSchema.parse(res.body);
    expect(parsed.text).toBe('Veg thali ₹1,200 per plate\nCall [PHONE]');
    expect(parsed.redactions).toEqual([{ type: 'phone', count: 1 }]);
    expect(parsed.provenance.mode).toBe('gemini');
    expect(calls[0]).toMatchObject({
      json: false,
      files: [{ mimeType: 'image/png', dataBase64: PNG_BASE64 }],
    });
    expect(JSON.stringify(calls[0])).not.toContain('quote-from-vendor');

    await request(app).post('/api/quotes/read').send(readBody('image/png', PNG_BASE64));
    expect(calls).toHaveLength(1);
  });

  it('refuses bytes that are not the declared type with a fixed message', async () => {
    const html = Buffer.from('<html><script>alert(1)</script></html>').toString('base64');
    const { app, calls } = makeApp({ script: () => Promise.resolve('never') });
    const res = await request(app).post('/api/quotes/read').send(readBody('image/png', html));
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain(QUOTE_FILE_MISMATCH_MESSAGE);
    expect(res.text).not.toContain('quote-from-vendor');
    expect(calls).toHaveLength(0);
  });

  it('accepts a two-page PDF and refuses four pages or an unknown count', async () => {
    const { app, calls } = makeApp({ script: () => Promise.resolve('Decor package ₹85,000') });
    expect(
      (
        await request(app)
          .post('/api/quotes/read')
          .send(readBody('application/pdf', pdfBase64(2)))
      ).status,
    ).toBe(200);
    const long = await request(app)
      .post('/api/quotes/read')
      .send(readBody('application/pdf', pdfBase64(4)));
    expect(long.status).toBe(400);
    expect(long.body.error.message).toBe(PDF_PAGES_MESSAGE);
    const unknown = Buffer.from('%PDF-1.7 no page markers here at all').toString('base64');
    expect(
      (await request(app).post('/api/quotes/read').send(readBody('application/pdf', unknown)))
        .status,
    ).toBe(400);
    expect(calls).toHaveLength(1);
  });

  it('answers 413 above the 3 MiB route limit', async () => {
    const res = await request(makeApp().app)
      .post('/api/quotes/read')
      .send(readBody('image/png', 'A'.repeat(OVERSIZE_BASE64_CHARS)));
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('asks the family to paste the text when no model can read the file', async () => {
    const res = await request(makeApp().app)
      .post('/api/quotes/read')
      .send(readBody('image/png', PNG_BASE64));
    expect(res.status).toBe(502);
    expect(res.body.error.message).toBe(PASTE_HINT);
  });

  it('refuses a transcript with no readable text', async () => {
    const { app } = makeApp({ script: () => Promise.resolve('​​') });
    const res = await request(app).post('/api/quotes/read').send(readBody('image/png', PNG_BASE64));
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe(NO_TEXT_MESSAGE);
  });

  it('limits file reads per client, tighter than the AI limit the route also runs', async () => {
    // The file bucket only decides the 429 while it is the smaller of the two on this route.
    expect(FILE_READS_PER_MINUTE).toBeLessThan(AI_REQUESTS_PER_MINUTE);
    const { app } = makeApp();
    const statuses: number[] = [];
    for (let i = 0; i <= FILE_READS_PER_MINUTE; i += 1)
      statuses.push((await request(app).post('/api/quotes/read').send({})).status);
    expect(statuses.slice(0, FILE_READS_PER_MINUTE).every((status) => status === 400)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });
});
