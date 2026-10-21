/**
 * Per-client token-bucket rate limiter.
 *
 * Responsibility: cap how fast one client can call the API (AI routes cost free-tier quota)
 * with a smooth refill instead of hard windows; the client is named by the injected key
 * function (the Cloudflare-aware client key in production). Boundary: in-memory per instance;
 * the clock is injected for tests.
 */
import { appError } from '@intezaam/core';
import type { Request, RequestHandler } from 'express';
import { sendError } from '../http/respond.js';

/** One minute — the unit the limits are expressed in. */
const WINDOW_MS = 60_000;

/** Sweep idle buckets at most this often so the map cannot grow without bound. */
const SWEEP_INTERVAL_MS = 60_000;

const MS_PER_SECOND = 1_000;

export interface RateLimitOptions {
  /** Requests allowed per minute; also the burst size. */
  readonly perMinute: number;
  readonly now: () => number;
  /** Names the client a request belongs to. */
  readonly keyOf: (req: Request) => string;
}

interface Bucket {
  tokens: number;
  updatedAt: number;
}

/**
 * Creates a limiter middleware; responds 429 `RATE_LIMITED` with Retry-After when a bucket is empty.
 * @example
 * router.post('/plan', createRateLimiter({ perMinute: 30, now: Date.now, keyOf }), handler);
 */
export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const { perMinute, now, keyOf } = options;
  const refillPerMs = perMinute / WINDOW_MS;
  const buckets = new Map<string, Bucket>();
  let lastSweep = now();

  const sweep = (at: number): void => {
    // A bucket idle for a full window is back at capacity, so forgetting it changes nothing.
    for (const [key, bucket] of buckets) {
      if (at - bucket.updatedAt >= WINDOW_MS) buckets.delete(key);
    }
    lastSweep = at;
  };

  return (req, res, next) => {
    const at = now();
    if (at - lastSweep >= SWEEP_INTERVAL_MS) sweep(at);
    const key = keyOf(req);
    const bucket = buckets.get(key) ?? { tokens: perMinute, updatedAt: at };
    bucket.tokens = Math.min(perMinute, bucket.tokens + (at - bucket.updatedAt) * refillPerMs);
    bucket.updatedAt = at;
    buckets.set(key, bucket);
    if (bucket.tokens < 1) {
      res.setHeader(
        'Retry-After',
        String(Math.ceil((1 - bucket.tokens) / refillPerMs / MS_PER_SECOND)),
      );
      sendError(res, appError('RATE_LIMITED'));
      return;
    }
    bucket.tokens -= 1;
    next();
  };
}
