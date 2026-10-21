/**
 * Tests for the model-call concurrency gate (services/gated-genai.ts) and the routes behind it.
 *
 * Responsibility: prove a slot is held only while a model works, a client with no gateway is
 * left alone, and with every slot busy a plan still answers (offline, reason upstream_error),
 * a cache hit and a rule answer never wait, and a quote-file read gets 429 with the paste hint.
 * Boundary: supertest against buildApp with a scripted model whose calls hang until the test
 * releases them; expected values come from core, the offline app or the gate's own constants.
 */
import {
  askByRules,
  askResponseSchema,
  buildPlan,
  errorResponseSchema,
  narrateOffline,
  planResponseSchema,
} from '@intezaam/core';
import type { Express } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { MAX_IN_FLIGHT_AI } from '../server.js';
import { createConcurrencyGate } from '../services/concurrency.js';
import { gateModelCalls } from '../services/gated-genai.js';
import { createOfflineGenAiClient } from '../services/genai-client.js';
import { CACHE_ENGINE } from '../services/provenance.js';
import { PASTE_HINT } from '../services/quote-read-service.js';
import {
  TEST_MODELS,
  TODAY,
  ganeshContext,
  makeApp,
  makeClient,
  scriptedCaller,
  weddingContext,
} from './helpers.js';

const context = weddingContext();
const built = buildPlan(context, TODAY);
if (!built.ok) throw new Error('the sample wedding must plan');
const FAITHFUL = JSON.stringify(narrateOffline(built.value, context));
const WEDDING = { context, todayIso: TODAY };
/** A different plan, so its narration never comes from the wedding's cache entry. */
const GANESH = { context: ganeshContext(), todayIso: TODAY };
/** A question core answers by rule (a booking refusal), never by the model. */
const RULE_QUESTION = 'Please book the caterer for me';
/** Any PNG: the 8-byte signature the magic-byte check looks for, then filler. */
const PNG_BASE64 = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(24, 1),
]).toString('base64');

interface HeldModel {
  readonly releases: (() => void)[];
  readonly script: () => Promise<string>;
}

/** A model that answers the first `quick` calls at once and holds every later one until released. */
function heldModel(quick: number): HeldModel {
  const releases: (() => void)[] = [];
  let answered = 0;
  const script = (): Promise<string> => {
    answered += 1;
    if (answered <= quick) return Promise.resolve(FAITHFUL);
    return new Promise((resolve) => releases.push(() => resolve(FAITHFUL)));
  };
  return { releases, script };
}

/** Starts as many plan requests as there are slots and waits until each holds one. */
async function fillSlots(app: Express, held: HeldModel, body: object): Promise<Promise<number>[]> {
  const pending = Array.from({ length: MAX_IN_FLIGHT_AI }, () =>
    request(app)
      .post('/api/plan')
      .send(body)
      .then((res) => res.status),
  );
  await vi.waitFor(() => expect(held.releases).toHaveLength(MAX_IN_FLIGHT_AI));
  return pending;
}

/** Lets the held calls answer and checks every one of them was served. */
async function drain(held: HeldModel, pending: Promise<number>[]): Promise<void> {
  held.releases.forEach((release) => release());
  expect(await Promise.all(pending)).toEqual(pending.map(() => 200));
}

describe('gateModelCalls', () => {
  it('leaves a client with no gateway as it is: its calls do no upstream work', () => {
    const offline = createOfflineGenAiClient();
    expect(gateModelCalls(offline, createConcurrencyGate(1))).toBe(offline);
  });

  it('holds a slot only while the model works and fails fast, typed, when none is free', async () => {
    const gate = createConcurrencyGate(1);
    const releases: (() => void)[] = [];
    const caller = scriptedCaller(
      () => new Promise((resolve) => releases.push(() => resolve('quote text'))),
    );
    const genai = gateModelCalls(makeClient(caller.caller), gate);
    expect(genai.models).toEqual(TEST_MODELS);
    const first = genai.generateText({ system: 'transcribe', prompt: 'the file' });
    await vi.waitFor(() => expect(releases).toHaveLength(1));
    expect(gate.inFlight).toBe(1);
    const second = await genai.generateText({ system: 'transcribe', prompt: 'the file' });
    expect(second.ok ? 'ok' : [second.error.reason, second.error.code]).toEqual([
      'upstream_error',
      'RATE_LIMITED',
    ]);
    releases.forEach((release) => release());
    const done = await first;
    expect(done.ok ? done.value.value : 'failed').toBe('quote text');
    expect(gate.inFlight).toBe(0);
    expect(caller.calls).toHaveLength(1);
  });
});

describe('routes while every model slot is busy', () => {
  it('serves the offline narration with reason upstream_error instead of a 429', async () => {
    const held = heldModel(0);
    const { app, calls, logs } = makeApp({ script: held.script });
    const pending = await fillSlots(app, held, WEDDING);
    const busy = await request(app).post('/api/plan').send(WEDDING);
    const offline = await request(makeApp().app).post('/api/plan').send(WEDDING);
    expect(busy.status).toBe(200);
    const parsed = planResponseSchema.parse(busy.body);
    expect(parsed.provenance).toMatchObject({ mode: 'offline', reason: 'upstream_error' });
    expect(parsed.narration).toEqual(planResponseSchema.parse(offline.body).narration);
    expect(calls).toHaveLength(MAX_IN_FLIGHT_AI);
    expect(logs.some((line) => line.includes('every model slot is busy'))).toBe(true);
    await drain(held, pending);
  });

  it('serves a cached narration without waiting for a slot', async () => {
    const held = heldModel(1);
    const { app, calls } = makeApp({ script: held.script });
    const first = planResponseSchema.parse(
      (await request(app).post('/api/plan').send(WEDDING)).body,
    );
    const pending = await fillSlots(app, held, GANESH);
    const hit = await request(app).post('/api/plan').send(WEDDING);
    expect(hit.status).toBe(200);
    const parsed = planResponseSchema.parse(hit.body);
    expect(parsed.provenance.mode).toBe(first.provenance.mode);
    expect(parsed.provenance.steps.map((step) => step.engine)).toContain(CACHE_ENGINE);
    expect(parsed.narration).toEqual(first.narration);
    expect(calls).toHaveLength(1 + MAX_IN_FLIGHT_AI);
    await drain(held, pending);
  });

  it('answers an Ask by rule without waiting for a slot', async () => {
    const held = heldModel(0);
    const { app, calls } = makeApp({ script: held.script });
    const pending = await fillSlots(app, held, WEDDING);
    const res = await request(app)
      .post('/api/ask')
      .send({ ...WEDDING, question: RULE_QUESTION, history: [] });
    expect(res.status).toBe(200);
    const expected = askByRules(RULE_QUESTION, built.value, context, TODAY)?.refusal;
    expect(expected).toBeDefined();
    expect(askResponseSchema.parse(res.body).refusal).toEqual(expected);
    expect(calls).toHaveLength(MAX_IN_FLIGHT_AI);
    await drain(held, pending);
  });

  it('asks for the pasted quote text when a file read finds no free slot', async () => {
    const held = heldModel(0);
    const { app, calls } = makeApp({ script: held.script });
    const pending = await fillSlots(app, held, WEDDING);
    const res = await request(app)
      .post('/api/quotes/read')
      .send({ file: { mimeType: 'image/png', fileName: 'quote.png', dataBase64: PNG_BASE64 } });
    expect(res.status).toBe(429);
    expect(errorResponseSchema.parse(res.body).error).toMatchObject({
      code: 'RATE_LIMITED',
      message: PASTE_HINT,
    });
    expect(calls).toHaveLength(MAX_IN_FLIGHT_AI);
    await drain(held, pending);
  });
});
