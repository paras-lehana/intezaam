/**
 * Tests for abort-on-disconnect (09 Gap 4 §4.4).
 *
 * Responsibility: prove a client that leaves stops the model call and the failover, and one
 * that waits is never aborted — the regression the request's `close` event would cause. (The
 * concurrency gate on model calls is tested in gated-genai.test.ts.) Boundary: a real
 * listening server on an ephemeral port, because supertest cannot hang up mid-request.
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { narrateOffline, buildPlan } from '@intezaam/core';
import { describe, expect, it, vi } from 'vitest';
import { type Script, TODAY, makeApp, weddingContext } from './helpers.js';

const context = weddingContext();
const built = buildPlan(context, TODAY);
if (!built.ok) throw new Error('the sample wedding must plan');
const FAITHFUL = JSON.stringify(narrateOffline(built.value, context));
const PLAN_BODY = JSON.stringify({ context, todayIso: TODAY });

/** The client hangs up this long after sending its request. */
const CLIENT_LEAVES_AFTER_MS = 50;
/** A model that answers this fast completes well before any timeout. */
const MODEL_ANSWERS_AFTER_MS = 80;

/** A model that answers after `ms`, or rejects (and records it) when its signal aborts. */
function slowModel(ms: number, aborted: string[]): Script {
  return (call) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(FAITHFUL), ms);
      call.signal.addEventListener('abort', () => {
        clearTimeout(timer);
        aborted.push(call.model);
        reject(new Error('aborted'));
      });
    });
}

/** Posts the plan to a listening server; resolves with the status, or 0 when the client hung up. */
function postPlan(port: number, leaveAfterMs?: number): Promise<number> {
  return new Promise((resolve) => {
    const req = http.request(
      { port, path: '/api/plan', method: 'POST', headers: { 'content-type': 'application/json' } },
      (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode ?? 0));
      },
    );
    req.on('error', () => resolve(0));
    req.end(PLAN_BODY);
    if (leaveAfterMs !== undefined) setTimeout(() => req.destroy(), leaveAfterMs);
  });
}

async function withServer(script: Script, run: (port: number) => Promise<void>): Promise<string[]> {
  const { app, calls } = makeApp({ script });
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  const address: AddressInfo | string | null = server.address();
  try {
    if (address === null || typeof address === 'string') throw new Error('expected a TCP address');
    await run(address.port);
  } finally {
    server.close();
  }
  return calls.map((call) => call.model);
}

describe('abort on client disconnect', () => {
  it('aborts the model call when the client leaves and never tries the next model', async () => {
    const aborted: string[] = [];
    const models = await withServer(slowModel(60_000, aborted), async (port) => {
      expect(await postPlan(port, CLIENT_LEAVES_AFTER_MS)).toBe(0);
      await vi.waitFor(() => expect(aborted).toEqual(['model-a']));
    });
    expect(models).toEqual(['model-a']);
  });

  it('never aborts a client that waits for its answer', async () => {
    const aborted: string[] = [];
    await withServer(slowModel(MODEL_ANSWERS_AFTER_MS, aborted), async (port) => {
      expect(await postPlan(port)).toBe(200);
    });
    expect(aborted).toEqual([]);
  });
});
