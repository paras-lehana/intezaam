/**
 * Responsibility: preparing a quote file — only the four accepted types, nothing over 2 MB,
 * standard base64, a long name trimmed to the schema's cap, and core's magic-byte check run
 * before upload so a renamed file never leaves the device. Boundary: files are built in the
 * test from real signatures; the request is validated with core's own schema.
 */
import { describe, expect, it } from 'vitest';
import { MAX_QUOTE_FILE_BYTES } from '@intezaam/core';
import { quoteReadRequestSchema } from '@intezaam/core/schemas';
import {
  MAX_QUOTE_UPLOAD_BYTES,
  MAX_SENT_NAME_CHARS,
  TOO_LARGE_MESSAGE,
  WRONG_TYPE_MESSAGE,
  fileToBase64,
  prepareQuoteFile,
} from '../../../components/features/vendors/quote-file';

/** The PNG 8-byte signature plus a few bytes (a real header, so the check passes). */
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);

describe('fileToBase64', () => {
  it('encodes bytes as standard base64', async () => {
    await expect(fileToBase64(new Blob(['%PDF-']))).resolves.toBe('JVBERi0=');
  });
});

describe('prepareQuoteFile', () => {
  it('builds a request the server’s strict schema accepts', async () => {
    const prepared = await prepareQuoteFile(
      new File([PNG_BYTES], 'quote.png', { type: 'image/png' }),
    );
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(quoteReadRequestSchema.parse(prepared.value)).toEqual(prepared.value);
    expect(prepared.value.file.mimeType).toBe('image/png');
  });

  it('refuses types the reader does not take', async () => {
    const text = new File(['quote'], 'quote.txt', { type: 'text/plain' });
    await expect(prepareQuoteFile(text)).resolves.toEqual({ ok: false, error: WRONG_TYPE_MESSAGE });
  });

  it('caps uploads at exactly the decoded size core accepts', () => {
    // The early File-size check re-declares core's cap; this keeps the two from drifting apart.
    expect(MAX_QUOTE_UPLOAD_BYTES).toBe(MAX_QUOTE_FILE_BYTES);
  });

  it('refuses a file over the size cap without reading it', async () => {
    const big = new File([new Uint8Array(MAX_QUOTE_UPLOAD_BYTES + 1)], 'big.pdf', {
      type: 'application/pdf',
    });
    await expect(prepareQuoteFile(big)).resolves.toEqual({ ok: false, error: TOO_LARGE_MESSAGE });
  });

  it('refuses a renamed file whose bytes are another type', async () => {
    const svg = new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'quote.jpg', {
      type: 'image/jpeg',
    });
    const prepared = await prepareQuoteFile(svg);
    expect(prepared.ok).toBe(false);
  });

  it('trims a long file name to the schema’s cap', async () => {
    const name = `${'q'.repeat(MAX_SENT_NAME_CHARS * 2)}.png`;
    const prepared = await prepareQuoteFile(new File([PNG_BYTES], name, { type: 'image/png' }));
    expect(prepared.ok && prepared.value.file.fileName.length).toBe(MAX_SENT_NAME_CHARS);
  });
});
