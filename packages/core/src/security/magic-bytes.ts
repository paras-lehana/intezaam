/**
 * Quote-file contract and magic-byte check for `POST /api/quotes/read` (research note 09 Gap 4).
 *
 * Responsibility: accept one vendor quote as a PDF, JPEG, PNG or WebP (≤ 2 MiB decoded) and
 * prove the bytes are the type the browser claimed by reading their signature, so a renamed
 * executable, HTML page or SVG (script-capable, never allowed) can never reach the model.
 * Boundary: pure and shared by browser and server — decodes only the 16 leading base64
 * characters; PDF page counting and the model call live in the server.
 */
import { z } from 'zod';
import { base64DecodedLength, base64HeaderBytes } from './base64.js';

export const QUOTE_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type QuoteFileType = (typeof QUOTE_FILE_TYPES)[number];

/** 2 MiB decoded: sample quotes were 2–105 KB and phone photos a few hundred KB (09 §4.2.5). */
export const MAX_QUOTE_FILE_BYTES = 2 * 1024 * 1024;

/** ceil(2 MiB ÷ 3) × 4 base64 characters (09 §4.2.5). */
export const MAX_QUOTE_FILE_BASE64_CHARS = Math.ceil(MAX_QUOTE_FILE_BYTES / 3) * 4;

/** 16 characters decode to 12 bytes: the longest signature (WebP) ends at byte 12. */
const MIN_QUOTE_FILE_BASE64_CHARS = 16;
const SIGNATURE_BYTES = 12;
const MAX_FILE_NAME_CHARS = 120;

/** Standard base64 alphabet with optional padding; url-safe or whitespace is rejected. */
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

interface ByteRun {
  readonly offset: number;
  readonly bytes: readonly number[];
}

/** Published signatures: "%PDF-", JPEG SOI + marker, the PNG 8-byte header, "RIFF....WEBP". */
const SIGNATURES: Readonly<Record<QuoteFileType, readonly ByteRun[]>> = {
  'application/pdf': [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }],
  'image/jpeg': [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  'image/png': [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  'image/webp': [
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
    { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  ],
};

function matchesRuns(header: readonly number[], runs: readonly ByteRun[]): boolean {
  return runs.every(({ offset, bytes }) =>
    bytes.every((byte, index) => header[offset + index] === byte),
  );
}

/**
 * The file type the leading bytes prove, or undefined for anything else.
 * @example
 * sniffFileType('JVBERi0xLjQKJcfs'); // 'application/pdf'
 * sniffFileType('PHN2ZyB4bWxucz0i'); // undefined (an SVG)
 */
export function sniffFileType(dataBase64: string): QuoteFileType | undefined {
  const header = base64HeaderBytes(dataBase64, SIGNATURE_BYTES);
  if (header === undefined) return undefined;
  return QUOTE_FILE_TYPES.find((type) => matchesRuns(header, SIGNATURES[type]));
}

/**
 * True when the bytes carry the signature of the declared type.
 * @example
 * matchesFileSignature('image/png', 'iVBORw0KGgoAAAAN'); // true
 * matchesFileSignature('image/jpeg', 'iVBORw0KGgoAAAAN'); // false
 */
export function matchesFileSignature(mimeType: QuoteFileType, dataBase64: string): boolean {
  return sniffFileType(dataBase64) === mimeType;
}

/** The fixed message a mismatch returns; it never echoes the file name or bytes. */
export const QUOTE_FILE_MISMATCH_MESSAGE =
  'That file is not a PDF, JPEG, PNG or WebP. Send a screenshot or paste the text instead.';
export const QUOTE_FILE_TOO_LARGE_MESSAGE =
  'That file is over 2 MB. Send a smaller photo or paste the text.';

export const quoteFileSchema = z
  .strictObject({
    mimeType: z.enum(QUOTE_FILE_TYPES),
    fileName: z.string().trim().min(1).max(MAX_FILE_NAME_CHARS),
    dataBase64: z
      .string()
      .min(MIN_QUOTE_FILE_BASE64_CHARS)
      .max(MAX_QUOTE_FILE_BASE64_CHARS)
      .regex(BASE64),
  })
  .superRefine((file, refinement) => {
    if (base64DecodedLength(file.dataBase64) > MAX_QUOTE_FILE_BYTES) {
      refinement.addIssue({
        code: 'custom',
        path: ['dataBase64'],
        message: QUOTE_FILE_TOO_LARGE_MESSAGE,
      });
    }
    if (!matchesFileSignature(file.mimeType, file.dataBase64)) {
      refinement.addIssue({
        code: 'custom',
        path: ['dataBase64'],
        message: QUOTE_FILE_MISMATCH_MESSAGE,
      });
    }
  });

export type QuoteFile = z.infer<typeof quoteFileSchema>;
