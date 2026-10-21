/**
 * In-flight concurrency gate for model calls.
 *
 * Responsibility: cap simultaneous model calls per instance (gated-genai.ts holds a slot only
 * while the model works) so a burst cannot exhaust memory, the gateway's per-client minute
 * budget or the free-tier quota. Boundary: rejects immediately with RATE_LIMITED rather than
 * queueing — a fast fallback beats a request that times out.
 */
import { type Result, appError, err } from '@intezaam/core';

export interface ConcurrencyGate {
  run<T>(task: () => Promise<Result<T>>): Promise<Result<T>>;
  readonly inFlight: number;
}

/**
 * Creates a gate that allows at most `max` tasks at once.
 * @example
 * const gate = createConcurrencyGate(4); await gate.run(() => genai.generateText(request));
 */
export function createConcurrencyGate(max: number): ConcurrencyGate {
  let inFlight = 0;
  return {
    async run(task) {
      if (inFlight >= max) return err(appError('RATE_LIMITED'));
      inFlight += 1;
      try {
        return await task();
      } finally {
        inFlight -= 1;
      }
    },
    get inFlight() {
      return inFlight;
    },
  };
}
