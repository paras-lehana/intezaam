/**
 * Concurrency-gated GenAI client — the in-flight cap applied to model calls only.
 *
 * Responsibility: wrap a GenAiClient so every `generateJson` / `generateText` call holds one
 * slot of a ConcurrencyGate for exactly as long as the model works. The deterministic plan,
 * cache hits, rule answers (Ask refusals, change commands, common intents) and offline answers
 * never reach the client, so they never wait for a slot or get a 429 while slow model calls
 * are pending. A call that finds every slot busy fails at once with reason `upstream_error`:
 * the JSON jobs then serve their labelled offline twin, and the quote-file reader (which has
 * no offline twin) answers 429 asking for pasted text. Boundary: no queueing or retries;
 * failover, daily budgets and timeouts stay in genai-client.ts.
 */
import { err, ok } from '@intezaam/core';
import type { ConcurrencyGate } from './concurrency.js';
import { type GenAiClient, type GenAiResult, genAiError } from './genai-client.js';

/** For the server log only; the public message stays the generic RATE_LIMITED copy. */
const BUSY_HINT = 'every model slot is busy';

/**
 * Gates `client`'s model calls through `gate`. A client with no gateway configured is returned
 * as is: its calls fail at once without any upstream work, so there is nothing to cap.
 * @example
 * const genai = gateModelCalls(createGenAiClient(options), createConcurrencyGate(4));
 */
export function gateModelCalls(client: GenAiClient, gate: ConcurrencyGate): GenAiClient {
  if (!client.configured) return client;
  const gated = async <T>(call: () => Promise<GenAiResult<T>>): Promise<GenAiResult<T>> => {
    // The gate's own error is a plain AppError without the fallback reason, so the model's
    // result travels through the gate as a value and a full gate becomes a typed GenAiError.
    const slot = await gate.run(async () => ok(await call()));
    return slot.ok ? slot.value : err(genAiError('upstream_error', 'RATE_LIMITED', BUSY_HINT));
  };
  return {
    configured: client.configured,
    models: client.models,
    generateJson: (req) => gated(() => client.generateJson(req)),
    generateText: (req) => gated(() => client.generateText(req)),
  };
}
