/**
 * Responsibility: the API client's contract — a valid body comes back as a typed value; an
 * error envelope, an off-contract body, a non-JSON error page and a network failure each
 * become a typed ApiError (status 0 when nothing reached the server); requests are JSON
 * POSTs. Boundary: fetch is stubbed; every fixture is parsed through the core schema.
 */
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_MESSAGE_BY_CODE } from '@intezaam/core';
import { briefResponseSchema } from '@intezaam/core/schemas';
import {
  API_PATHS,
  NETWORK_ERROR_MESSAGE,
  NETWORK_STATUS,
  UNREADABLE_RESPONSE_MESSAGE,
  readBrief,
} from '../../lib/api';
import { GEMINI_PROVENANCE } from '../features/plan-fixtures';
import { HTTP_SERVER_ERROR, TEST_TODAY_ISO, jsonResponse, stubFetch } from '../helpers';

const HTTP_BAD_REQUEST = 400;
const HTTP_BAD_GATEWAY = 502;

/** The brief this suite sends (test-owned input). */
const BRIEF = { text: 'Shaadi in Jaipur, 300 log', todayIso: TEST_TODAY_ISO };

const BRIEF_RESPONSE = briefResponseSchema.parse({
  draft: { city: 'Jaipur', guests: 300, family: 'wedding' },
  filled: ['city', 'guests', 'family'],
  missing: ['budget', 'date'],
  understood: 'A 300-guest wedding in Jaipur',
  provenance: GEMINI_PROVENANCE,
});

describe('readBrief', () => {
  it('returns the validated reply', async () => {
    stubFetch(jsonResponse(BRIEF_RESPONSE));
    await expect(readBrief(BRIEF)).resolves.toEqual({ ok: true, value: BRIEF_RESPONSE });
  });

  it('posts JSON to the brief route', async () => {
    const fetchMock = stubFetch(jsonResponse(BRIEF_RESPONSE));
    await readBrief(BRIEF);
    const [path, init] = fetchMock.mock.calls[0] ?? [];
    expect(path).toBe(API_PATHS.brief);
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json');
    expect(init?.body).toBe(JSON.stringify(BRIEF));
  });

  it('passes an abort signal through', async () => {
    const fetchMock = stubFetch(jsonResponse(BRIEF_RESPONSE));
    const controller = new AbortController();
    await readBrief(BRIEF, controller.signal);
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  });
});

describe('error mapping', () => {
  it('keeps the server’s code, message and status', async () => {
    const message = DEFAULT_MESSAGE_BY_CODE.VALIDATION_FAILED;
    stubFetch(jsonResponse({ error: { code: 'VALIDATION_FAILED', message } }, HTTP_BAD_REQUEST));
    await expect(readBrief(BRIEF)).resolves.toEqual({
      ok: false,
      error: { code: 'VALIDATION_FAILED', message, status: HTTP_BAD_REQUEST },
    });
  });

  it('treats a 200 body that breaks the contract as unreadable', async () => {
    stubFetch(jsonResponse({ draft: { guests: 'many' } }));
    const result = await readBrief(BRIEF);
    expect(result).toEqual({
      ok: false,
      error: { code: 'INTERNAL', message: UNREADABLE_RESPONSE_MESSAGE, status: 200 },
    });
  });

  it('treats a non-JSON error page (a proxy) as unreadable, keeping the status', async () => {
    stubFetch(new Response('<html>Bad gateway</html>', { status: HTTP_BAD_GATEWAY }));
    const result = await readBrief(BRIEF);
    expect(result.ok ? undefined : result.error).toEqual({
      code: 'INTERNAL',
      message: UNREADABLE_RESPONSE_MESSAGE,
      status: HTTP_BAD_GATEWAY,
    });
  });

  it('rejects an error envelope with an unknown code', async () => {
    stubFetch(jsonResponse({ error: { code: 'TEAPOT', message: 'no' } }, HTTP_SERVER_ERROR));
    const result = await readBrief(BRIEF);
    expect(result.ok ? undefined : result.error.message).toBe(UNREADABLE_RESPONSE_MESSAGE);
  });

  it('reports a network failure with status 0', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline')));
    await expect(readBrief(BRIEF)).resolves.toEqual({
      ok: false,
      error: { code: 'INTERNAL', message: NETWORK_ERROR_MESSAGE, status: NETWORK_STATUS },
    });
  });
});
