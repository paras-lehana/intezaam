/**
 * Server-clock check for the client's `todayIso`.
 *
 * Responsibility: reject a request whose `todayIso` is more than a day away from today's date
 * in India by the server's clock. The schemas measure the planning window (MAX_DAYS_AHEAD /
 * MAX_DAYS_PAST) from `todayIso`, so without this check a caller could pick its own "today",
 * move the window anywhere and reach years the engine was never built for. Boundary: runs
 * before schema validation and judges only a well-formed date; a missing or malformed
 * `todayIso` is left to the schema, which reports it. The received value is never echoed.
 */
import { appError, daysBetweenIso } from '@intezaam/core';
import type { RequestHandler } from 'express';
import { sendError } from '../http/respond.js';

/** IST is UTC+05:30 all year (India has no daylight saving); every event here is in India. */
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1_000;

/**
 * One calendar day either way: the browser sends its own local date, and every time zone in
 * use (UTC−12 to UTC+14) is less than one day from India's, so an honest client always passes.
 */
const MAX_TODAY_SKEW_DAYS = 1;

/** "YYYY-MM-DD".length — the date part of an ISO-8601 timestamp. */
const ISO_DATE_CHARS = 10;

/** Fixed copy in the validator's "field: problem" shape; never interpolates the value. */
export const TODAY_MISMATCH_MESSAGE =
  'todayIso: must be today’s date (it is checked against the server clock).';

/**
 * Today's date in India for an epoch-millisecond reading of the server clock.
 * @example
 * indiaTodayIso(Date.UTC(2026, 9, 20, 20, 0)); // '2026-10-21' (01:30 IST)
 */
export function indiaTodayIso(nowMs: number): string {
  return new Date(nowMs + IST_OFFSET_MS).toISOString().slice(0, ISO_DATE_CHARS);
}

/**
 * True when `todayIso` is a date within one day of today in India, or cannot be read as a
 * date at all (the schema rejects that with its own message).
 * @example
 * isPlausibleToday('2026-10-21', Date.UTC(2026, 9, 20, 12, 0)); // true
 * isPlausibleToday('9999-12-01', Date.UTC(2026, 9, 20, 12, 0)); // false
 */
export function isPlausibleToday(todayIso: string, nowMs: number): boolean {
  const skew = daysBetweenIso(indiaTodayIso(nowMs), todayIso);
  return skew === undefined || Math.abs(skew) <= MAX_TODAY_SKEW_DAYS;
}

/** The `todayIso` string a raw body carries, if any (the body is not validated yet). */
function claimedToday(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null || !('todayIso' in body)) return undefined;
  return typeof body.todayIso === 'string' ? body.todayIso : undefined;
}

/**
 * Middleware for every route whose body carries `todayIso`: a value more than a day from
 * the server's date in India gets 400 VALIDATION_FAILED before the schema runs.
 * @example
 * router.post('/plan', limiter, json, requireServerToday(Date.now), validate(schema, handle));
 */
export function requireServerToday(now: () => number): RequestHandler {
  return (req, res, next) => {
    const claimed = claimedToday(req.body);
    if (claimed !== undefined && !isPlausibleToday(claimed, now())) {
      sendError(res, appError('VALIDATION_FAILED', TODAY_MISMATCH_MESSAGE));
      return;
    }
    next();
  };
}
