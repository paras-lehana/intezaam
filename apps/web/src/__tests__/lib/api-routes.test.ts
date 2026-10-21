/**
 * Responsibility: every API function calls its own route with the right method, sends a body
 * the server's strict request schema accepts (an extra key is a 400 there), and returns the
 * reply only after the core response schema accepted it. Boundary: fetch is stubbed; each
 * reply is parsed through its core schema, and the narration reply is derived from a real plan.
 */
import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import {
  askRequestSchema,
  askResponseSchema,
  draftRequestSchema,
  draftResponseSchema,
  googleServicesResponseSchema,
  healthResponseSchema,
  planRequestSchema,
  quoteReadRequestSchema,
  quoteReadResponseSchema,
  quotesRequestSchema,
  quotesResponseSchema,
} from '@intezaam/core/schemas';
import {
  type ApiResult,
  API_PATHS,
  askPlanner,
  compareQuotes,
  fetchDraft,
  fetchGoogleServices,
  fetchHealth,
  fetchNarration,
  readQuoteFile,
} from '../../lib/api';
import { GEMINI_PROVENANCE, narrationResponseFor, samplePlan } from '../features/plan-fixtures';
import { TEST_TODAY_ISO, jsonResponse, stubFetch } from '../helpers';

const { context, plan } = samplePlan('jaipur-wedding');
const base = { context, todayIso: TEST_TODAY_ISO };

interface RouteCase {
  readonly name: string;
  readonly path: string;
  readonly method: 'GET' | 'POST';
  readonly reply: unknown;
  readonly call: () => Promise<ApiResult<unknown>>;
  /** The server's request schema for a POST route. */
  readonly request?: z.ZodType;
}

const CASES: readonly RouteCase[] = [
  {
    name: 'fetchNarration',
    path: API_PATHS.narration,
    method: 'POST',
    reply: narrationResponseFor(plan),
    call: () => fetchNarration(base),
    request: planRequestSchema,
  },
  {
    name: 'compareQuotes',
    path: API_PATHS.quotesCompare,
    method: 'POST',
    reply: quotesResponseSchema.parse({
      quotes: [],
      normalised: [],
      differences: [],
      questions: [],
      provenance: GEMINI_PROVENANCE,
    }),
    call: () =>
      compareQuotes({ ...base, category: 'caterer', quotes: [{ id: 'q1', text: '₹950 a plate' }] }),
    request: quotesRequestSchema,
  },
  {
    name: 'readQuoteFile',
    path: API_PATHS.quotesRead,
    method: 'POST',
    reply: quoteReadResponseSchema.parse({
      text: 'Veg buffet ₹950 a plate',
      redactions: [],
      provenance: GEMINI_PROVENANCE,
    }),
    call: () =>
      readQuoteFile({
        file: {
          mimeType: 'application/pdf',
          fileName: 'quote.pdf',
          dataBase64: 'JVBERi0xLjQKJcfs',
        },
      }),
    request: quoteReadRequestSchema,
  },
  {
    name: 'fetchDraft',
    path: API_PATHS.drafts,
    method: 'POST',
    reply: draftResponseSchema.parse({
      body: 'Namaste, we are planning a wedding in Jaipur.',
      whatsappUrl: 'https://wa.me/?text=Namaste',
      provenance: GEMINI_PROVENANCE,
    }),
    call: () =>
      fetchDraft({
        ...base,
        kind: 'vendor-enquiry',
        language: 'en',
        tone: 'warm',
        vendorType: 'caterer',
      }),
    request: draftRequestSchema,
  },
  {
    name: 'askPlanner',
    path: API_PATHS.ask,
    method: 'POST',
    reply: askResponseSchema.parse({
      answer: 'The food line is in the Money tab.',
      sources: [],
      provenance: GEMINI_PROVENANCE,
    }),
    call: () => askPlanner({ ...base, question: 'Catering kitna hai?', history: [] }),
    request: askRequestSchema,
  },
  {
    name: 'fetchGoogleServices',
    path: API_PATHS.googleServices,
    method: 'GET',
    reply: googleServicesResponseSchema.parse({ services: [] }),
    call: () => fetchGoogleServices(),
  },
  {
    name: 'fetchHealth',
    path: API_PATHS.health,
    method: 'GET',
    reply: healthResponseSchema.parse({
      status: 'ok',
      version: '0.1.0',
      ai: { configured: false, models: [] },
    }),
    call: () => fetchHealth(),
  },
];

describe.each(CASES)('$name', ({ path, method, reply, call }) => {
  it(`calls ${path} with ${method} and returns the validated body`, async () => {
    const fetchMock = stubFetch(jsonResponse(reply));
    await expect(call()).resolves.toEqual({ ok: true, value: reply });
    const [calledPath, init] = fetchMock.mock.calls[0] ?? [];
    expect(calledPath).toBe(path);
    expect(init?.method ?? 'GET').toBe(method);
  });

  it('refuses a body that does not match the contract', async () => {
    stubFetch(jsonResponse({ unexpected: true }));
    const result = await call();
    expect(result.ok).toBe(false);
  });
});

const POST_CASES = CASES.flatMap((route) =>
  route.request === undefined ? [] : [{ ...route, request: route.request }],
);

describe.each(POST_CASES)('$name request', ({ reply, call, request }) => {
  it('sends a body the server’s strict request schema accepts', async () => {
    const fetchMock = stubFetch(jsonResponse(reply));
    await call();
    const body: unknown = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(request.safeParse(body).success).toBe(true);
  });
});
