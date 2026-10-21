/**
 * Tests for services/genai-client.ts: model failover, the daily budget guard, fallback reasons,
 * timeouts, aborts and the offline client.
 *
 * Responsibility: pin the behaviour the services rely on. Boundary: the model is a scripted
 * caller and the clock is fake, so no network or real time is involved.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createDailyBudget } from '../services/daily-budget.js';
import { failoverOrder, isRetryableStatus, statusOf } from '../services/failover.js';
import { createGenAiClient, createOfflineGenAiClient } from '../services/genai-client.js';
import {
  TEST_MODELS,
  createFakeClock,
  makeClient,
  scriptedCaller,
  statusError,
} from './helpers.js';

const answerSchema = z.object({ answer: z.string() });
const request = { system: 'system', prompt: 'prompt', schema: answerSchema };

describe('genai client failover', () => {
  it('returns the first model result and its timing, asking for JSON', async () => {
    const clock = createFakeClock();
    const scripted = scriptedCaller(() => {
      clock.advance(250);
      return Promise.resolve('{"answer":"yes"}');
    });
    const result = await makeClient(scripted.caller, clock.now).generateJson(request);
    expect(result).toEqual({
      ok: true,
      value: { value: { answer: 'yes' }, model: 'model-a', ms: 250 },
    });
    expect(scripted.calls[0]).toMatchObject({ model: 'model-a', system: 'system', json: true });
  });

  it('fails over on 503/429 in order and remembers the last good model', async () => {
    const scripted = scriptedCaller((call) =>
      call.model === 'model-c'
        ? Promise.resolve('{"answer":"ok"}')
        : Promise.reject(statusError(call.model === 'model-a' ? 503 : 429)),
    );
    const client = makeClient(scripted.caller);
    const first = await client.generateJson(request);
    expect(first.ok && first.value.model).toBe('model-c');
    expect(scripted.calls.map((call) => call.model)).toEqual([...TEST_MODELS]);

    await client.generateJson(request);
    expect(scripted.calls.map((call) => call.model).slice(TEST_MODELS.length)).toEqual(['model-c']);
  });

  it('stops on a key error with reason upstream_error and never leaks the upstream message', async () => {
    const scripted = scriptedCaller(() => Promise.reject(statusError(403)));
    const result = await makeClient(scripted.caller).generateJson(request);
    expect(scripted.calls).toHaveLength(1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatchObject({ code: 'UPSTREAM_FAILURE', reason: 'upstream_error' });
      expect(result.error.message).not.toContain('secret');
    }
  });

  it('tries the next model when output is not valid for the schema', async () => {
    const scripted = scriptedCaller((call) =>
      Promise.resolve(
        call.model === 'model-a' ? '{"wrong":1}' : '```json\n{"answer":"fenced"}\n```',
      ),
    );
    const result = await makeClient(scripted.caller).generateJson(request);
    expect(result.ok && result.value.value).toEqual({ answer: 'fenced' });
  });

  it('treats empty responses and unknown errors as transient', async () => {
    const scripted = scriptedCaller((call) =>
      call.model === 'model-a'
        ? Promise.resolve('  ')
        : Promise.reject(new Error('socket hang up')),
    );
    const result = await makeClient(scripted.caller).generateText(request);
    expect(scripted.calls).toHaveLength(TEST_MODELS.length);
    expect(result.ok).toBe(false);
  });

  it('reports a timeout when a model never answers, honouring a per-request timeout', async () => {
    const scripted = scriptedCaller(() => new Promise<string>(() => undefined));
    const client = createGenAiClient({
      caller: scripted.caller,
      models: ['slow'],
      timeoutMs: 60_000,
      now: Date.now,
    });
    const result = await client.generateText({ ...request, timeoutMs: 20 });
    expect(result.ok ? 'ok' : result.error.code).toBe('UPSTREAM_TIMEOUT');
  });

  it('makes no attempt once the caller has aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const scripted = scriptedCaller(() => Promise.reject(statusError(503)));
    const result = await makeClient(scripted.caller).generateText({
      ...request,
      signal: controller.signal,
    });
    expect(result.ok ? 'ok' : result.error.reason).toBe('upstream_error');
    expect(scripted.calls).toHaveLength(0);
  });

  it('returns trimmed plain text for generateText and passes files through', async () => {
    const scripted = scriptedCaller(() => Promise.resolve('  transcribed text  '));
    const files = [{ mimeType: 'image/png', dataBase64: 'iVBORw0KGgoAAAAN' }];
    const result = await makeClient(scripted.caller).generateText({ ...request, files });
    expect(result.ok && result.value.value).toBe('transcribed text');
    expect(scripted.calls[0]).toMatchObject({ json: false, files });
  });
});

describe('daily budget guard in the failover', () => {
  it('skips a spent model and reports daily_quota once every model is spent', async () => {
    const clock = createFakeClock();
    const limits = new Map(TEST_MODELS.map((model) => [model, 1]));
    const budget = createDailyBudget({ limits, now: clock.now });
    const scripted = scriptedCaller((call) =>
      call.model === 'model-a'
        ? Promise.resolve('{"answer":"a"}')
        : Promise.reject(statusError(503)),
    );
    const client = makeClient(scripted.caller, clock.now, budget);
    expect((await client.generateJson(request)).ok).toBe(true);
    const second = await client.generateJson(request);
    expect(scripted.calls.map((call) => call.model)).toEqual(['model-a', 'model-b', 'model-c']);
    expect(second.ok ? 'ok' : second.error.reason).toBe('upstream_error');

    const third = await client.generateJson(request);
    expect(third.ok ? 'ok' : third.error.reason).toBe('daily_quota');
    expect(scripted.calls).toHaveLength(TEST_MODELS.length);
  });
});

describe('helpers', () => {
  it('reads a numeric status only', () => {
    expect(statusOf(statusError(429))).toBe(429);
    expect(statusOf(Object.assign(new Error('x'), { status: '429' }))).toBeUndefined();
    expect(statusOf('boom')).toBeUndefined();
  });

  it('puts the preferred model first', () => {
    expect(failoverOrder(['a', 'b', 'c'], 'c')).toEqual(['c', 'a', 'b']);
    expect(failoverOrder(['a', 'b'], undefined)).toEqual(['a', 'b']);
  });

  it('retries quota, overload and unknown failures but not key errors', () => {
    expect([429, 503, undefined].map(isRetryableStatus)).toEqual([true, true, true]);
    expect([401, 403].map(isRetryableStatus)).toEqual([false, false]);
  });
});

describe('offline client', () => {
  it('is unconfigured and fails every call with reason not_configured', async () => {
    const client = createOfflineGenAiClient();
    expect(client.configured).toBe(false);
    expect(client.models).toEqual([]);
    const json = await client.generateJson(request);
    expect(json.ok ? 'ok' : json.error.reason).toBe('not_configured');
    expect((await client.generateText(request)).ok).toBe(false);
  });
});
