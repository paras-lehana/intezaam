/**
 * Typed API client for every server route.
 *
 * Responsibility: send JSON to /api, validate every response with the shared core zod
 * schema (the same contract the server is tested against) and turn every failure — no
 * network, an error status, an off-contract body — into a typed {@link ApiError} value.
 * Boundary: the only module in the web app that calls `fetch`; components receive
 * `Result`s and never parse JSON. Planning itself never waits on this client: the plan is
 * computed in the browser, and these calls only add AI narration, drafts and answers.
 */
import type { z } from 'zod';
import type { ErrorCode, Result } from '@intezaam/core';
import {
  type AskRequest,
  type AskResponse,
  type BriefRequest,
  type BriefResponse,
  type DraftRequest,
  type DraftResponse,
  type GoogleServicesResponse,
  type HealthResponse,
  type NarrationResponse,
  type PlanRequest,
  type QuoteReadRequest,
  type QuoteReadResponse,
  type QuotesRequest,
  type QuotesResponse,
  askResponseSchema,
  briefResponseSchema,
  draftResponseSchema,
  errorResponseSchema,
  googleServicesResponseSchema,
  healthResponseSchema,
  narrationResponseSchema,
  quoteReadResponseSchema,
  quotesResponseSchema,
} from '@intezaam/core/schemas';

/** A failure the UI can show: always a known code and a user-safe message. */
export interface ApiError {
  readonly code: ErrorCode;
  readonly message: string;
  /** HTTP status, or 0 when the request never reached the server (offline, aborted). */
  readonly status: number;
}

export type ApiResult<T> = Result<T, ApiError>;

/** Every route the web calls, in one table. */
export const API_PATHS = {
  brief: '/api/brief',
  narration: '/api/plan/narration',
  quotesCompare: '/api/quotes/compare',
  quotesRead: '/api/quotes/read',
  drafts: '/api/drafts',
  ask: '/api/ask',
  googleServices: '/api/google/services',
  health: '/api/health',
} as const;

/** The status a request gets when it never reached the server. */
export const NETWORK_STATUS = 0;

export const NETWORK_ERROR_MESSAGE =
  'We could not reach Intezaam. Check your connection — your plan still works offline.';
export const UNREADABLE_RESPONSE_MESSAGE =
  'The server sent a reply we could not read. Please try again.';

const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' };

function failure(code: ErrorCode, message: string, status: number): ApiResult<never> {
  return { ok: false, error: { code, message, status } };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    const body: unknown = await response.json();
    return body;
  } catch {
    return undefined;
  }
}

/** The server's error envelope when it sent one; a fixed message for anything else (a proxy page). */
function errorFrom(status: number, body: unknown): ApiResult<never> {
  const envelope = errorResponseSchema.safeParse(body);
  return envelope.success
    ? failure(envelope.data.error.code, envelope.data.error.message, status)
    : failure('INTERNAL', UNREADABLE_RESPONSE_MESSAGE, status);
}

async function request<S extends z.ZodType>(
  path: string,
  schema: S,
  init: RequestInit,
): Promise<ApiResult<z.output<S>>> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    // Offline, DNS, CORS or an aborted request: nothing reached the server.
    return failure('INTERNAL', NETWORK_ERROR_MESSAGE, NETWORK_STATUS);
  }
  const body = await readJson(response);
  if (!response.ok) return errorFrom(response.status, body);
  const parsed = schema.safeParse(body);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : failure('INTERNAL', UNREADABLE_RESPONSE_MESSAGE, response.status);
}

function post<S extends z.ZodType>(
  path: string,
  schema: S,
  payload: unknown,
  signal?: AbortSignal,
): Promise<ApiResult<z.output<S>>> {
  return request(path, schema, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
    signal: signal ?? null,
  });
}

function get<S extends z.ZodType>(
  path: string,
  schema: S,
  signal?: AbortSignal,
): Promise<ApiResult<z.output<S>>> {
  return request(path, schema, { headers: { Accept: 'application/json' }, signal: signal ?? null });
}

/**
 * POST /api/brief — read a free-text brief (English, Hindi or Hinglish) into a draft context.
 * @example
 * const read = await readBrief({ text: 'Shaadi in Jaipur, 300 log', todayIso: '2026-10-20' });
 */
export function readBrief(
  req: BriefRequest,
  signal?: AbortSignal,
): Promise<ApiResult<BriefResponse>> {
  return post(API_PATHS.brief, briefResponseSchema, req, signal);
}

/**
 * POST /api/plan/narration — the AI narration for a plan the browser has already computed.
 * Efficiency: the reply carries the narration alone (a few hundred bytes), not a second copy
 * of the plan (about 100 kB of JSON for a wedding) that would be parsed and thrown away.
 * @example
 * const narrated = await fetchNarration({ context, todayIso }, controller.signal);
 */
export function fetchNarration(
  req: PlanRequest,
  signal?: AbortSignal,
): Promise<ApiResult<NarrationResponse>> {
  return post(API_PATHS.narration, narrationResponseSchema, req, signal);
}

/**
 * POST /api/quotes/compare — 1–3 pasted quotes, normalised by code against the budget line.
 * @example
 * const compared = await compareQuotes({ context, todayIso, category: 'caterer', quotes });
 */
export function compareQuotes(
  req: QuotesRequest,
  signal?: AbortSignal,
): Promise<ApiResult<QuotesResponse>> {
  return post(API_PATHS.quotesCompare, quotesResponseSchema, req, signal);
}

/**
 * POST /api/quotes/read — one photo or PDF of a quote, returned as a redacted, editable
 * transcript for the quote's text box (the comparison itself stays text-only).
 * @example
 * const read = await readQuoteFile({ file: { mimeType: 'application/pdf', fileName: 'q.pdf', dataBase64 } });
 */
export function readQuoteFile(
  req: QuoteReadRequest,
  signal?: AbortSignal,
): Promise<ApiResult<QuoteReadResponse>> {
  return post(API_PATHS.quotesRead, quoteReadResponseSchema, req, signal);
}

/**
 * POST /api/drafts — a vendor enquiry, invitation or thank-you in the chosen language.
 * @example
 * const draft = await fetchDraft({ context, todayIso, kind: 'vendor-enquiry', language: 'en', tone: 'warm' });
 */
export function fetchDraft(
  req: DraftRequest,
  signal?: AbortSignal,
): Promise<ApiResult<DraftResponse>> {
  return post(API_PATHS.drafts, draftResponseSchema, req, signal);
}

/**
 * POST /api/ask — a question answered from the plan, possibly with a proposed change.
 * @example
 * const answer = await askPlanner({ context, todayIso, question: 'Catering kitna?', history: [] });
 */
export function askPlanner(req: AskRequest, signal?: AbortSignal): Promise<ApiResult<AskResponse>> {
  return post(API_PATHS.ask, askResponseSchema, req, signal);
}

/**
 * GET /api/google/services — the Google services catalogue (env-var names only).
 * @example
 * const catalog = await fetchGoogleServices();
 */
export function fetchGoogleServices(
  signal?: AbortSignal,
): Promise<ApiResult<GoogleServicesResponse>> {
  return get(API_PATHS.googleServices, googleServicesResponseSchema, signal);
}

/**
 * GET /api/health — version and whether the AI models are configured.
 * @example
 * const health = await fetchHealth();
 */
export function fetchHealth(signal?: AbortSignal): Promise<ApiResult<HealthResponse>> {
  return get(API_PATHS.health, healthResponseSchema, signal);
}
