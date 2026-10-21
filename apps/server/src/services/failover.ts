/**
 * Failover helpers — the small decisions the GenAI client makes between model attempts.
 *
 * Responsibility: read an HTTP status from a transport error, decide whether another model
 * may succeed, order the models (last good one first) and turn an abort signal into a
 * rejection for callers that ignore it. Boundary: pure; no calls, no clock.
 */

/**
 * Statuses worth trying the next model for: 400 (a model rejecting an option), 404 (model not
 * offered to this key), 408/429 (quota, overload) and 5xx. 401/403 are key problems that no
 * other model will fix.
 */
const RETRYABLE_STATUSES: ReadonlySet<number> = new Set([400, 404, 408, 429, 500, 502, 503, 504]);

/**
 * HTTP status carried by a transport error, if any.
 * @example
 * statusOf(Object.assign(new Error('x'), { status: 429 })); // 429
 */
export function statusOf(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    return typeof error.status === 'number' ? error.status : undefined;
  }
  return undefined;
}

/**
 * True when another model may succeed; unknown failures (resets, no status) count as transient.
 * @example
 * isRetryableStatus(403); // false
 */
export function isRetryableStatus(status: number | undefined): boolean {
  return status === undefined || RETRYABLE_STATUSES.has(status);
}

/**
 * Models in failover order: the last one that worked first, then the configured order.
 * @example
 * failoverOrder(['a', 'b', 'c'], 'c'); // ['c', 'a', 'b']
 */
export function failoverOrder(models: readonly string[], preferred: string | undefined): string[] {
  return [
    ...models.filter((model) => model === preferred),
    ...models.filter((model) => model !== preferred),
  ];
}

/**
 * Rejects when `signal` aborts — guards against callers that ignore their signal.
 * @example
 * await Promise.race([caller(call), rejectOnAbort(call.signal)]);
 */
export function rejectOnAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_resolve, reject) => {
    const fail = (): void => reject(new Error('aborted'));
    if (signal.aborted) fail();
    else signal.addEventListener('abort', fail, { once: true });
  });
}
