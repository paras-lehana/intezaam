/**
 * Service kit — the steps every GenAI service shares.
 *
 * Responsibility: the collaborators a service receives, a fresh prompt-fence nonce per call,
 * cache keys (SHA-256 of the redacted input), the per-service result cache (50 entries ×
 * 30 minutes), text hygiene (Unicode sanitiser, then PII redaction) and `tryModel`, which runs
 * one model job and records either the model step or the reason the offline twin answers.
 * Boundary: orchestration helpers only; prompts, guards and offline twins live in core.
 */
import { createHash, randomBytes } from 'node:crypto';
import { type Provenance, type RedactionCount, redactPii, sanitizeUserText } from '@intezaam/core';
import type { Logger } from '../logger.js';
import type { GenAiClient, JsonRequest } from './genai-client.js';
import { type LruCache, createLruCache } from './lru-cache.js';
import type { ProvenanceTracker } from './provenance.js';

/** A demo session rarely produces more than a few dozen distinct briefs, plans or quotes. */
const CACHE_MAX_ENTRIES = 50;

/** 30 minutes: long enough to revisit a plan, short enough that redacted text does not linger. */
const CACHE_TTL_MS = 30 * 60 * 1_000;

/** 8 random bytes → 16 hex characters, inside the core nonce pattern /^[a-f0-9]{8,32}$/. */
const NONCE_BYTES = 8;

/** Separates cache-key parts so ("ab", "c") and ("a", "bc") never collide. */
const KEY_SEPARATOR = '\u0000';

/** Collaborators every service receives. */
export interface ServiceDeps {
  readonly genai: GenAiClient;
  readonly now: () => number;
  readonly logger: Logger;
}

/** A cached model result with the provenance it was produced under. */
export interface CachedResult<V> {
  readonly value: V;
  readonly provenance: Provenance;
}

/**
 * A fresh prompt-boundary nonce, so pasted text cannot guess the closing delimiter.
 * @example
 * createNonce(); // '3f9c0a7d12b4e6a8'
 */
export function createNonce(): string {
  return randomBytes(NONCE_BYTES).toString('hex');
}

/**
 * A cache key: SHA-256 over the parts (already redacted), so raw text never sits in memory twice.
 * @example
 * cacheKey(['brief', 'shaadi in Jaipur', '2026-10-20']).length; // 64
 */
export function cacheKey(parts: readonly string[]): string {
  return createHash('sha256').update(parts.join(KEY_SEPARATOR)).digest('hex');
}

/**
 * The cache one service keeps for its model results.
 * @example
 * const cache = createResultCache<Narration>(Date.now);
 */
export function createResultCache<V>(now: () => number): LruCache<CachedResult<V>> {
  return createLruCache<CachedResult<V>>({
    maxEntries: CACHE_MAX_ENTRIES,
    ttlMs: CACHE_TTL_MS,
    now,
  });
}

export interface CleanText {
  readonly text: string;
  readonly redactions: RedactionCount[];
}

/**
 * Untrusted text as the model may see it: control, zero-width and bidi characters stripped
 * first (so a zero-width space cannot hide a phone number from the redactor), then phones,
 * emails, UPI, bank, Aadhaar, PAN and card numbers replaced, then capped again because a
 * placeholder can be longer than what it replaced.
 * @example
 * cleanUserText('Call 9876543210', 100).text; // 'Call [PHONE]'
 */
export function cleanUserText(text: string, maxChars: number): CleanText {
  const redacted = redactPii(sanitizeUserText(text, maxChars));
  return { text: sanitizeUserText(redacted.text, maxChars), redactions: redacted.redactions };
}

/**
 * Runs one JSON model job. On success the model step is recorded and the value returned; on
 * failure the fallback reason is recorded (and logged unless the AI is simply not configured)
 * and `undefined` tells the service to use its offline twin.
 * @example
 * const reply = await tryModel(deps, tracker, 'narrate', { system, prompt, schema, signal });
 */
export async function tryModel<T>(
  deps: ServiceDeps,
  tracker: ProvenanceTracker,
  job: string,
  request: JsonRequest<T>,
): Promise<T | undefined> {
  const result = await deps.genai.generateJson(request);
  if (result.ok) {
    tracker.model(job, result.value.model, result.value.ms);
    return result.value.value;
  }
  tracker.fallback(result.error.reason);
  if (result.error.reason !== 'not_configured') {
    deps.logger.log('WARNING', 'model job fell back to offline', {
      job,
      reason: result.error.reason,
      hint: result.error.internalHint ?? 'none',
    });
  }
  return undefined;
}

/**
 * Serves a cache hit: records it on the tracker and returns the value with this request's
 * provenance (same mode and models as when it was produced).
 * @example
 * const hit = fromCache(cache.get(key), tracker, startedAt);
 */
export function fromCache<V>(
  cached: CachedResult<V> | undefined,
  tracker: ProvenanceTracker,
  startedAt: number,
): { readonly value: V; readonly provenance: Provenance } | undefined {
  if (cached === undefined) return undefined;
  tracker.cacheHit(cached.provenance, startedAt);
  return { value: cached.value, provenance: tracker.build(cached.provenance.mode) };
}
