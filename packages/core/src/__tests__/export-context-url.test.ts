/**
 * Tests for the share-link codec (context in the URL fragment, no server storage).
 *
 * Responsibility: every sample context round-trips; a "#" prefix and spaces are accepted;
 * a wrong version, an oversized link, broken base64, invalid UTF-8, non-JSON and a context
 * that fails the schema all give the same user-safe error and never throw. Boundary: pure.
 */
import { describe, expect, it } from 'vitest';
import { sampleContext, SAMPLE_IDS } from '../domain/samples.js';
import {
  decodeContextFromUrl,
  encodeContextForUrl,
  MAX_CONTEXT_URL_CHARS,
} from '../export/context-url.js';
import { bytesToBase64Url, utf8Bytes } from '../security/base64.js';
import { TODAY } from './fixtures/genai-plans.js';

const BASE64URL = /^v1\.[A-Za-z0-9_-]+$/;

function encodeRaw(text: string): string {
  return `v1.${bytesToBase64Url(utf8Bytes(text))}`;
}

describe('encodeContextForUrl / decodeContextFromUrl', () => {
  it('round-trips every sample context through a URL-safe string', () => {
    for (const id of SAMPLE_IDS) {
      const context = JSON.parse(JSON.stringify(sampleContext(id, TODAY)));
      const encoded = encodeContextForUrl(context);
      expect(encoded).toMatch(BASE64URL);
      expect(decodeContextFromUrl(encoded)).toEqual({ ok: true, value: context });
    }
  });

  it('keeps a Hindi title intact and accepts a leading "#" and spaces', () => {
    const context = { ...sampleContext('jaipur-wedding', TODAY), title: 'मीना की शादी' };
    const decoded = decodeContextFromUrl(`  #${encodeContextForUrl(context)} `);
    expect(decoded.ok && decoded.value.title).toBe('मीना की शादी');
  });

  it('rejects a wrong version and an oversized link before decoding', () => {
    const encoded = encodeContextForUrl(sampleContext('bengaluru-birthday', TODAY));
    expect(decodeContextFromUrl(encoded.replace('v1.', 'v2.')).ok).toBe(false);
    expect(decodeContextFromUrl(`v1.${'A'.repeat(MAX_CONTEXT_URL_CHARS)}`).ok).toBe(false);
  });

  it('rejects broken base64, invalid UTF-8, non-JSON and a context that fails the schema', () => {
    const broken = [
      'v1.!!!not-base64!!!',
      `v1.${bytesToBase64Url([0xff, 0xfe, 0xfd])}`,
      encodeRaw('{not json'),
      encodeRaw(JSON.stringify({ ...sampleContext('society-ganesh', TODAY), guests: -5 })),
    ];
    for (const link of broken) {
      const result = decodeContextFromUrl(link);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION_FAILED');
        expect(result.error.message).toBe(
          'This share link is broken or out of date. Please ask for a new one.',
        );
      }
    }
  });
});
