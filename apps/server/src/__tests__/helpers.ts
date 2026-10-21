/**
 * Test helpers — fake clock, scripted model caller, config and app builders, sample inputs.
 *
 * Responsibility: build the real production app with fakes so every route is exercised
 * in-process. Boundary: fixtures pin only inputs (contexts, briefs, quotes, config); expected
 * outputs are derived from core at test time, so tests never hardcode engine results.
 */
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type EventContext, sampleContext } from '@intezaam/core';
import type { Express } from 'express';
import type { ServerConfig } from '../config.js';
import { type Logger, createJsonLogger } from '../logger.js';
import { buildApp } from '../server.js';
import type { DailyBudget } from '../services/daily-budget.js';
import {
  type GenAiClient,
  type ModelCall,
  type ModelCaller,
  createGenAiClient,
  createOfflineGenAiClient,
} from '../services/genai-client.js';

/** The fixed "today" every request uses, so plans and dates are reproducible. */
export const TODAY = '2026-10-20';

/** Meena's Jaipur wedding (300 guests, ₹25 L), dated relative to TODAY by core. */
export function weddingContext(): EventContext {
  return sampleContext('jaipur-wedding', TODAY);
}

/** Kavita's society Ganesh utsav (a community event). */
export function ganeshContext(): EventContext {
  return sampleContext('society-ganesh', TODAY);
}

/** A Hinglish brief with a city, guest count and budget the offline reader also finds. */
export const BRIEF_TEXT = 'Beti ki shaadi Jaipur mein, 300 log, 25 lakh budget. Call 9876543210';

/** Manually advanced clock so rate limits, caches, budgets and latencies are deterministic. */
export interface FakeClock {
  readonly now: () => number;
  advance(ms: number): void;
}

/** 2026-10-20 12:00 UTC (early morning in Los Angeles); only differences between readings matter otherwise. */
export const CLOCK_START_MS = Date.UTC(2026, 9, 20, 12, 0, 0);

export function createFakeClock(start: number = CLOCK_START_MS): FakeClock {
  let current = start;
  return {
    now: () => current,
    advance(ms) {
      current += ms;
    },
  };
}

/** A scripted step: return text, or throw an error with an HTTP status. */
export type Script = (call: ModelCall) => Promise<string | undefined>;

export interface ScriptedCaller {
  readonly caller: ModelCaller;
  readonly calls: ModelCall[];
}

/** Records every call and answers with `script`. */
export function scriptedCaller(script: Script): ScriptedCaller {
  const calls: ModelCall[] = [];
  return {
    calls,
    caller: async (call) => {
      calls.push(call);
      return script(call);
    },
  };
}

/** Answers every call with `value` serialised to JSON. */
export function replyWith(value: unknown): Script {
  return () => Promise.resolve(JSON.stringify(value));
}

/** An error shaped like a transport error (carries an HTTP status and a secret-looking body). */
export function statusError(status: number): Error & { status: number } {
  return Object.assign(new Error(`upstream said ${status} with secret body`), { status });
}

export const TEST_MODELS = ['model-a', 'model-b', 'model-c'] as const;

/** Secret values set on the test config; no response may ever contain them. */
export const SECRETS = {
  internalKey: 'internal-secret-123',
  upstreamKey: 'upstream-secret-456',
} as const;

export function makeConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
  return {
    port: 0,
    llmService: {
      url: 'http://llm-service:8095',
      internalKey: SECRETS.internalKey,
      upstreamUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      upstreamKey: SECRETS.upstreamKey,
      ref: 'intezaam',
      models: TEST_MODELS,
      dailyLimits: new Map(TEST_MODELS.map((model) => [model, 10])),
    },
    llmTimeoutMs: 1_000,
    trustProxyHops: 1,
    webDistDir: join(tmpdir(), 'intezaam-no-web-build'),
    nodeEnv: 'test',
    appVersion: '9.9.9',
    refused: [],
    ...overrides,
  };
}

/** A failover client over {@link TEST_MODELS} driven by `caller`. */
export function makeClient(
  caller: ModelCaller,
  now: () => number = Date.now,
  budget?: DailyBudget,
): GenAiClient {
  return createGenAiClient({
    caller,
    models: TEST_MODELS,
    timeoutMs: 1_000,
    now,
    ...(budget === undefined ? {} : { budget }),
  });
}

export interface TestApp {
  readonly app: Express;
  readonly clock: FakeClock;
  readonly logs: string[];
  readonly logger: Logger;
  /** Model calls made through the scripted caller (empty for the offline client). */
  readonly calls: ModelCall[];
}

export interface AppOptions {
  /** Script for the model; absent = the offline client (AI not configured). */
  readonly script?: Script;
  /** A ready client, for tests that need their own (e.g. a throwing one). */
  readonly genai?: GenAiClient;
  readonly config?: Partial<ServerConfig>;
}

/** Builds the real app with a fake clock, captured logs and a scripted or offline model. */
export function makeApp(options: AppOptions = {}): TestApp {
  const clock = createFakeClock();
  const logs: string[] = [];
  const logger = createJsonLogger((line) => logs.push(line));
  const scripted = options.script === undefined ? undefined : scriptedCaller(options.script);
  const genai =
    options.genai ??
    (scripted === undefined ? createOfflineGenAiClient() : makeClient(scripted.caller, clock.now));
  let requests = 0;
  const newRequestId = (): string => {
    requests += 1;
    return `test-request-${requests}`;
  };
  const app = buildApp(makeConfig(options.config), { genai, now: clock.now, logger, newRequestId });
  return { app, clock, logs, logger, calls: scripted?.calls ?? [] };
}

/** Creates a temporary web build with an index.html and one hashed asset. */
export function makeWebDist(): string {
  const dir = mkdtempSync(join(tmpdir(), 'intezaam-web-'));
  mkdirSync(join(dir, 'assets'));
  writeFileSync(
    join(dir, 'index.html'),
    '<!doctype html><title>Intezaam</title><div id="root"></div>',
  );
  writeFileSync(join(dir, 'assets', 'app-abc123.js'), 'export {};');
  return dir;
}

/** Parses a JSON string a test sent, typed as unknown (no casts). */
export function parseJson(text: string): unknown {
  return JSON.parse(text);
}
