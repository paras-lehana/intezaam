/**
 * GenAI client — the server's only doorway to a generative model.
 *
 * Responsibility: run one request across the configured models with per-attempt timeouts,
 * skip models whose daily budget is spent, fail over on transient errors (remembering the last
 * good model), zod-validate JSON replies, and say WHY when no model answered
 * (`daily_quota`, `upstream_error` or `not_configured`) so the response's provenance can tell
 * the user. Boundary: the transport sits behind the injected `ModelCaller`; returned errors
 * carry only status codes, never a key or upstream text.
 */
import { type AppError, type OfflineReason, type Result, appError, err, ok } from '@intezaam/core';
import type { z } from 'zod';
import { type DailyBudget, unlimitedBudget } from './daily-budget.js';
import { failoverOrder, isRetryableStatus, rejectOnAbort, statusOf } from './failover.js';
import { parseModelJson } from './model-json.js';

/** A file sent inline to the model (a quote photo or PDF), base64 encoded. */
export interface InlineFile {
  readonly mimeType: string;
  readonly dataBase64: string;
}

/** One concrete call to one model — what the transport adapter receives. */
export interface ModelCall {
  readonly model: string;
  readonly system: string;
  readonly prompt: string;
  readonly files: readonly InlineFile[];
  /** True asks for a JSON reply; the schema itself already travels in the system instruction. */
  readonly json: boolean;
  readonly maxOutputTokens: number;
  readonly signal: AbortSignal;
}

/** Performs one model call; throws on failure (errors may carry an HTTP `status`). */
export type ModelCaller = (call: ModelCall) => Promise<string | undefined>;

export interface TextRequest {
  readonly system: string;
  readonly prompt: string;
  readonly files?: readonly InlineFile[];
  readonly signal?: AbortSignal;
  readonly maxOutputTokens?: number;
  /** Overrides the client's per-attempt timeout (file reads use a tighter one). */
  readonly timeoutMs?: number;
}

export interface JsonRequest<T> extends TextRequest {
  readonly schema: z.ZodType<T>;
}

export interface Generated<T> {
  readonly value: T;
  readonly model: string;
  readonly ms: number;
}

/** Why a response came from the offline twin: core's OFFLINE_REASONS, the one list (addendum 13). */
export type FallbackReason = OfflineReason;

/** An AppError that also says why no model answered. */
export interface GenAiError extends AppError {
  readonly reason: FallbackReason;
}

export type GenAiResult<T> = Result<Generated<T>, GenAiError>;

export interface GenAiClient {
  readonly configured: boolean;
  readonly models: readonly string[];
  generateJson<T>(req: JsonRequest<T>): Promise<GenAiResult<T>>;
  generateText(req: TextRequest): Promise<GenAiResult<string>>;
}

export interface GenAiClientOptions {
  readonly caller: ModelCaller;
  readonly models: readonly string[];
  readonly timeoutMs: number;
  readonly now: () => number;
  /** Absent = no daily cap (unit tests of the failover). */
  readonly budget?: DailyBudget;
}

/** Default output budget: the largest reply (a narrated plan with 12 ideas) fits well inside 8k tokens. */
const DEFAULT_MAX_OUTPUT_TOKENS = 8_192;

type Attempt =
  | { readonly kind: 'ok'; readonly text: string }
  | {
      readonly kind: 'failed';
      readonly timedOut: boolean;
      readonly retryable: boolean;
      readonly hint: string;
    };

/**
 * Builds the error a failed generation returns.
 * @example
 * genAiError('daily_quota', 'UPSTREAM_FAILURE', 'every model spent').reason; // 'daily_quota'
 */
export function genAiError(
  reason: FallbackReason,
  code: AppError['code'],
  hint: string,
): GenAiError {
  return { ...appError(code, undefined, hint), reason };
}

/**
 * Creates a failover client over `options.models`.
 * @example
 * const client = createGenAiClient({ caller, models: ['a', 'b'], timeoutMs: 45_000, now: Date.now, budget });
 */
export function createGenAiClient(options: GenAiClientOptions): GenAiClient {
  const { caller, models, timeoutMs, now } = options;
  const budget = options.budget ?? unlimitedBudget();
  let preferred: string | undefined;

  const callOnce = async (model: string, req: TextRequest, json: boolean): Promise<Attempt> => {
    const timeout = AbortSignal.timeout(req.timeoutMs ?? timeoutMs);
    const signal = req.signal === undefined ? timeout : AbortSignal.any([req.signal, timeout]);
    const call: ModelCall = {
      model,
      system: req.system,
      prompt: req.prompt,
      files: req.files ?? [],
      json,
      maxOutputTokens: req.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
      signal,
    };
    try {
      const text = await Promise.race([caller(call), rejectOnAbort(signal)]);
      if (text === undefined || text.trim().length === 0) {
        return { kind: 'failed', timedOut: false, retryable: true, hint: 'empty response' };
      }
      return { kind: 'ok', text };
    } catch (error: unknown) {
      if (timeout.aborted)
        return { kind: 'failed', timedOut: true, retryable: true, hint: 'timeout' };
      const status = statusOf(error);
      return {
        kind: 'failed',
        timedOut: false,
        retryable: isRetryableStatus(status),
        hint: `status ${status ?? 'none'}`,
      };
    }
  };

  const run = async <T>(
    req: TextRequest,
    json: boolean,
    parse: (text: string) => Result<T>,
  ): Promise<GenAiResult<T>> => {
    // A spent model is skipped; when all are spent the caller serves offline with that reason.
    const order = failoverOrder(models, preferred).filter((model) => budget.available(model));
    if (order.length === 0) {
      return err(
        genAiError('daily_quota', 'UPSTREAM_FAILURE', 'every model has spent its daily budget'),
      );
    }
    let timedOut = false;
    let hint = 'no attempt made';
    for (const model of order) {
      // Efficiency: a client that already left needs no further attempt.
      if (req.signal?.aborted === true) break;
      budget.spend(model);
      const startedAt = now();
      const attempt = await callOnce(model, req, json);
      if (attempt.kind === 'ok') {
        const parsed = parse(attempt.text);
        if (parsed.ok) {
          preferred = model;
          return ok({ value: parsed.value, model, ms: now() - startedAt });
        }
        hint = `${model}: ${parsed.error.internalHint ?? 'invalid output'}`;
        continue;
      }
      timedOut = timedOut || attempt.timedOut;
      hint = `${model}: ${attempt.hint}`;
      if (!attempt.retryable) break;
    }
    return err(
      genAiError('upstream_error', timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_FAILURE', hint),
    );
  };

  return {
    configured: true,
    models,
    generateJson: (req) => run(req, true, (text) => parseModelJson(text, req.schema)),
    generateText: (req) => run(req, false, (text) => ok(text.trim())),
  };
}

/**
 * The client for when no gateway is configured: every call fails fast with reason
 * `not_configured`, so callers take their offline path.
 * @example
 * createOfflineGenAiClient().configured; // false
 */
export function createOfflineGenAiClient(): GenAiClient {
  const offline = genAiError('not_configured', 'UPSTREAM_FAILURE', 'no LLM gateway configured');
  return {
    configured: false,
    models: [],
    generateJson: () => Promise.resolve(err(offline)),
    generateText: () => Promise.resolve(err(offline)),
  };
}
