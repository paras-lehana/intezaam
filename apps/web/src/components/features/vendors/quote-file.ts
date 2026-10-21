/**
 * A vendor's quote file (photo or PDF), checked and encoded for the quote reader.
 *
 * Responsibility: accept only the four types the server accepts, refuse oversized files
 * before reading them, encode the bytes as standard base64, and run core's own request
 * contract (`quoteReadRequestSchema`, whose magic-byte check reads the file's leading bytes)
 * so a renamed file is refused before it is uploaded. Boundary: a convenience check — the
 * server re-validates with the same schema and is the only authority.
 */
import type { Result } from '@intezaam/core';
import { type QuoteReadRequest, quoteReadRequestSchema } from '@intezaam/core/schemas';

/** The file types core's request contract accepts, read off the schema the web already uses. */
type QuoteFileType = QuoteReadRequest['file']['mimeType'];

/** The four types core's quoteFileSchema accepts (a closed table over its union). */
export const QUOTE_FILE_LABELS: Readonly<Record<QuoteFileType, string>> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
};

/** The file picker's `accept` list. */
export const QUOTE_FILE_ACCEPT = Object.keys(QUOTE_FILE_LABELS).join(',');

/**
 * Core's MAX_QUOTE_FILE_BYTES (2 MiB decoded). Checked on the File's
 * size first so a 50 MB video is refused without being read into memory; the schema below
 * checks the encoded size again.
 */
export const MAX_QUOTE_UPLOAD_BYTES = 2 * 1024 * 1024;

export const WRONG_TYPE_MESSAGE = 'Choose a photo (JPEG, PNG or WebP) or a PDF of the quote.';
export const TOO_LARGE_MESSAGE = 'That file is over 2 MB. Send a smaller photo or paste the text.';

/** Core's quoteFileSchema caps names at 120 characters; only the name's start is useful. */
export const MAX_SENT_NAME_CHARS = 120;
/** A name for a file the browser handed over without one. */
const UNNAMED_FILE = 'quote';

/** 32 KiB per String.fromCharCode call stays well under every engine's argument limit. */
const ENCODE_CHUNK = 0x8000;

function isQuoteFileType(mimeType: string): mimeType is QuoteFileType {
  return Object.hasOwn(QUOTE_FILE_LABELS, mimeType);
}

/**
 * Standard base64 of a file's bytes.
 * @example
 * await fileToBase64(new File(['%PDF-'], 'q.pdf')); // 'JVBERi0='
 */
export async function fileToBase64(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  // Efficiency: chunked conversion avoids one huge argument list for a 2 MB photo.
  for (let start = 0; start < bytes.length; start += ENCODE_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(start, start + ENCODE_CHUNK));
  }
  return btoa(binary);
}

/**
 * The request body for a chosen file, or a plain reason it cannot be sent.
 * @example
 * const prepared = await prepareQuoteFile(file);
 * if (prepared.ok) await readQuoteFile(prepared.value);
 */
export async function prepareQuoteFile(file: File): Promise<Result<QuoteReadRequest, string>> {
  if (!isQuoteFileType(file.type)) return { ok: false, error: WRONG_TYPE_MESSAGE };
  if (file.size > MAX_QUOTE_UPLOAD_BYTES) return { ok: false, error: TOO_LARGE_MESSAGE };
  const fileName = file.name.trim().slice(0, MAX_SENT_NAME_CHARS) || UNNAMED_FILE;
  const request = quoteReadRequestSchema.safeParse({
    file: { mimeType: file.type, fileName, dataBase64: await fileToBase64(file) },
  });
  // Security: the bytes must prove the declared type — the server runs this same check —
  // and the reason shown is core's own fixed message, which never echoes the file.
  if (request.success) return { ok: true, value: request.data };
  return { ok: false, error: request.error.issues[0]?.message ?? WRONG_TYPE_MESSAGE };
}
