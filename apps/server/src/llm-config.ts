/**
 * LLM gateway settings and the outbound allow-list (the server's SSRF guard).
 *
 * Responsibility: turn the LLM_* variables into gateway settings, accepting the gateway only
 * when its URL is one of two known origins (the public gateway or its Docker-network name)
 * and its upstream is Google's Gemini API OpenAI-compatible endpoint. Anything else is refused
 * BY NAME, so the server runs on the offline planner and the startup self-test can refuse to
 * start in production. Boundary: pure parsing of an env record; never logs or returns a key.
 */
import { z } from 'zod';

/**
 * The only places the server may send prompts: the owner's public gateway and the same
 * service on the shared Docker network.
 */
export const ALLOWED_LLM_SERVICE_ORIGINS: readonly string[] = [
  'https://llm.lehana.in',
  'http://llm-service:8095',
];

/** Google's OpenAI-compatible Gemini API endpoint, free tier (GENAI_ARCHITECTURE.md). */
export const DEFAULT_LLM_UPSTREAM_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';

/** The upstream must stay the official Gemini API, because another relay could bill or breach terms. */
const ALLOWED_LLM_UPSTREAM_URLS: readonly string[] = [DEFAULT_LLM_UPSTREAM_URL];

/**
 * Free-tier models, fastest first: gemini-3.5-flash-lite answered in 2.8 s and
 * gemini-3.1-flash-lite in 25.8 s through the gateway (live probe, 2026-10-20 18:03);
 * gemini-2.5-flash-lite answers 404 for new keys.
 */
export const DEFAULT_LLM_MODELS: readonly string[] = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
];

/** 90% of the free tier's 500 requests per day per model, leaving room for manual checks. */
export const DEFAULT_DAILY_LIMIT = 450;

/** A typo guard: no free tier allows anywhere near this many requests a day. */
const MAX_DAILY_LIMIT = 100_000;

/** How llm-service's usage log names this app. */
const DEFAULT_LLM_SERVICE_REF = 'intezaam';

const ROOT_PATH = '/';

/** Fixed reasons: a refusal names the variable, never echoes its value. */
const INCOMPLETE_REASON =
  'needs LLM_SERVICE_URL, LLM_SERVICE_KEY and LLM_UPSTREAM_KEY set together';
const NOT_ALLOWED_REASON = 'is not on the outbound allow-list';
const NOT_GEMINI_REASON = 'is not the Gemini API endpoint';

/** A setting present in the environment but refused; the reason is fixed text, never the value. */
export interface RefusedSetting {
  readonly name: string;
  readonly reason: string;
}

/** The owner's LLM gateway, present only when every setting is complete and allowed. */
export interface LlmServiceConfig {
  readonly url: string;
  readonly internalKey: string;
  readonly upstreamUrl: string;
  readonly upstreamKey: string;
  readonly ref: string;
  readonly models: readonly string[];
  /** Requests per day for each model in `models`. */
  readonly dailyLimits: ReadonlyMap<string, number>;
}

export interface LlmSettings {
  readonly llmService: LlmServiceConfig | undefined;
  readonly refused: readonly RefusedSetting[];
}

/** The LLM_* part of the environment schema (merged into config.ts). */
export const llmEnvShape = {
  LLM_SERVICE_URL: z.string().trim().optional(),
  LLM_SERVICE_KEY: z.string().optional(),
  LLM_UPSTREAM_URL: z.string().trim().min(1).default(DEFAULT_LLM_UPSTREAM_URL),
  LLM_UPSTREAM_KEY: z.string().optional(),
  LLM_SERVICE_REF: z.string().trim().min(1).default(DEFAULT_LLM_SERVICE_REF),
  LLM_MODELS: z.string().optional(),
  LLM_DAILY_LIMITS: z.string().optional(),
};

export type LlmEnv = z.infer<z.ZodObject<typeof llmEnvShape>>;

const dailyLimitSchema = z.coerce.number().int().min(1).max(MAX_DAILY_LIMIT);

/** Splits a comma list, trimming blanks. */
function splitList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * A value (URL or key) that is blank after trimming counts as absent.
 * @example
 * nonBlank('  '); // undefined
 */
export function nonBlank(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed !== undefined && trimmed.length > 0 ? trimmed : undefined;
}

/**
 * True when `raw` is exactly one of the allowed origins: no credentials, path, query or
 * fragment, so `https://llm.lehana.in@evil.example` or `…/byok?x=` can never pass.
 * @example
 * isAllowedServiceUrl('http://llm-service:8095'); // true
 * isAllowedServiceUrl('https://llm.lehana.in.evil.example'); // false
 */
export function isAllowedServiceUrl(raw: string): boolean {
  if (!URL.canParse(raw)) return false;
  const url = new URL(raw);
  const bare = url.username === '' && url.password === '' && url.search === '' && url.hash === '';
  return bare && url.pathname === ROOT_PATH && ALLOWED_LLM_SERVICE_ORIGINS.includes(url.origin);
}

/**
 * True when `raw` is the Gemini API's OpenAI-compatible endpoint (a trailing slash is fine).
 * @example
 * isAllowedUpstreamUrl('https://generativelanguage.googleapis.com/v1beta/openai/'); // true
 */
export function isAllowedUpstreamUrl(raw: string): boolean {
  return ALLOWED_LLM_UPSTREAM_URLS.includes(raw.replace(/\/+$/, ''));
}

/**
 * Per-model daily limits, given in model order; a model without its own entry reuses the last
 * one given (or the default). Throws on a non-numeric entry, like every other bad number.
 * @example
 * parseDailyLimits('450', ['a', 'b']); // Map { 'a' => 450, 'b' => 450 }
 */
export function parseDailyLimits(
  value: string | undefined,
  models: readonly string[],
): ReadonlyMap<string, number> {
  const given = splitList(value).map((item) => dailyLimitSchema.parse(item));
  return new Map(
    models.map((model, index) => [model, given[index] ?? given.at(-1) ?? DEFAULT_DAILY_LIMIT]),
  );
}

/**
 * The model failover chain, or the defaults when the variable is empty.
 * @example
 * parseModels(' a , b '); // ['a', 'b']
 */
export function parseModels(value: string | undefined): readonly string[] {
  const models = splitList(value);
  return Object.freeze(models.length > 0 ? models : [...DEFAULT_LLM_MODELS]);
}

/**
 * Gateway settings from the environment. Nothing set means offline by choice (no refusal);
 * a disallowed URL or an incomplete set of variables is refused by name.
 * @example
 * llmSettingsFrom({ ...env, LLM_SERVICE_URL: 'https://evil.example' }).refused[0]?.name; // 'LLM_SERVICE_URL'
 */
export function llmSettingsFrom(env: LlmEnv): LlmSettings {
  const url = nonBlank(env.LLM_SERVICE_URL);
  const internalKey = nonBlank(env.LLM_SERVICE_KEY);
  const upstreamKey = nonBlank(env.LLM_UPSTREAM_KEY);
  const models = parseModels(env.LLM_MODELS);
  const dailyLimits = parseDailyLimits(env.LLM_DAILY_LIMITS, models);
  if (url === undefined && internalKey === undefined && upstreamKey === undefined) {
    return { llmService: undefined, refused: [] };
  }
  if (url === undefined || internalKey === undefined || upstreamKey === undefined) {
    return {
      llmService: undefined,
      refused: [{ name: 'LLM_SERVICE_URL', reason: INCOMPLETE_REASON }],
    };
  }
  const refused: RefusedSetting[] = [
    ...(isAllowedServiceUrl(url) ? [] : [{ name: 'LLM_SERVICE_URL', reason: NOT_ALLOWED_REASON }]),
    ...(isAllowedUpstreamUrl(env.LLM_UPSTREAM_URL)
      ? []
      : [{ name: 'LLM_UPSTREAM_URL', reason: NOT_GEMINI_REASON }]),
  ];
  if (refused.length > 0) return { llmService: undefined, refused };
  return {
    llmService: Object.freeze({
      url,
      internalKey,
      upstreamUrl: env.LLM_UPSTREAM_URL,
      upstreamKey,
      ref: env.LLM_SERVICE_REF,
      models,
      dailyLimits,
    }),
    refused: [],
  };
}
