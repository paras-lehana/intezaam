/**
 * Tests for services/pdf-pages.ts: the dependency-free page counter behind the quote-file cap.
 *
 * Responsibility: pin the heuristic — page objects or the page tree's /Count, whichever is
 * higher, never counting "/Pages" itself, and 0 when nothing is found. Boundary: bytes in memory.
 */
import { describe, expect, it } from 'vitest';
import { countPdfPages } from '../services/pdf-pages.js';

const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

describe('countPdfPages', () => {
  it('counts page objects without counting the page tree', () => {
    expect(countPdfPages(encode('%PDF-1.4 /Type /Pages /Type /Page /Type/Page'))).toBe(2);
  });

  it('trusts a larger /Count when the page objects are compressed out of sight', () => {
    expect(countPdfPages(encode('%PDF-1.5 /Type /Pages /Count 12 /Type /Page'))).toBe(12);
  });

  it('returns 0 for a PDF with no page markers, so the caller fails closed', () => {
    expect(countPdfPages(encode('%PDF-1.7 nothing readable'))).toBe(0);
  });
});
