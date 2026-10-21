/**
 * Tests for config.ts, llm-config.ts and self-test.ts: environment parsing, the outbound
 * allow-list (SSRF guard) and the fail-closed startup self-test.
 *
 * Responsibility: pin defaults, refusals and the production decision. Boundary: plain env
 * records; nothing reads the real environment or the network.
 */
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config.js';
import {
  DEFAULT_DAILY_LIMIT,
  DEFAULT_LLM_MODELS,
  DEFAULT_LLM_UPSTREAM_URL,
  isAllowedServiceUrl,
  isAllowedUpstreamUrl,
} from '../llm-config.js';
import { runSelfTest } from '../self-test.js';

const GATEWAY = {
  LLM_SERVICE_URL: 'http://llm-service:8095',
  LLM_SERVICE_KEY: 'internal-secret',
  LLM_UPSTREAM_KEY: 'upstream-secret',
} as const;

describe('loadConfig', () => {
  it('runs offline with safe defaults when nothing is set', () => {
    const config = loadConfig({});
    expect(config).toMatchObject({
      port: 8080,
      llmService: undefined,
      llmTimeoutMs: 45_000,
      trustProxyHops: 1,
      nodeEnv: 'development',
      refused: [],
    });
    expect(config.appVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('enables the gateway with the free-tier defaults when URL and both keys are set', () => {
    const llm = loadConfig(GATEWAY).llmService;
    expect(llm).toMatchObject({
      url: GATEWAY.LLM_SERVICE_URL,
      upstreamUrl: DEFAULT_LLM_UPSTREAM_URL,
      ref: 'intezaam',
      models: DEFAULT_LLM_MODELS,
    });
    expect([...(llm?.dailyLimits ?? new Map()).values()]).toEqual(
      DEFAULT_LLM_MODELS.map(() => DEFAULT_DAILY_LIMIT),
    );
  });

  it('parses models and per-model daily limits, reusing the last limit for extra models', () => {
    const llm = loadConfig({
      ...GATEWAY,
      LLM_MODELS: ' m1 , ,m2,m3',
      LLM_DAILY_LIMITS: '100, 50',
    }).llmService;
    expect(llm?.models).toEqual(['m1', 'm2', 'm3']);
    expect(Object.fromEntries(llm?.dailyLimits ?? [])).toEqual({ m1: 100, m2: 50, m3: 50 });
  });

  it.each([
    ['a port out of range', { PORT: '70000' }],
    ['too many proxy hops', { TRUST_PROXY_HOPS: '6' }],
    ['a non-numeric daily limit', { ...GATEWAY, LLM_DAILY_LIMITS: 'lots' }],
    ['an unknown NODE_ENV', { NODE_ENV: 'staging' }],
  ])('throws at startup for %s', (_label, env) => {
    expect(() => loadConfig(env)).toThrow();
  });
});

describe('outbound allow-list', () => {
  it.each(['https://llm.lehana.in', 'https://llm.lehana.in/', 'http://llm-service:8095'])(
    'allows %s',
    (url) => {
      expect(isAllowedServiceUrl(url)).toBe(true);
    },
  );

  it.each([
    'http://llm.lehana.in',
    'https://llm.lehana.in/byok',
    'https://llm.lehana.in?next=evil',
    'https://user:pass@llm.lehana.in',
    'https://llm.lehana.in.evil.example',
    'http://llm-service:8096',
    'http://169.254.169.254',
    'not a url',
  ])('refuses %s', (url) => {
    expect(isAllowedServiceUrl(url)).toBe(false);
  });

  it('accepts only the Gemini API endpoint as the upstream', () => {
    expect(isAllowedUpstreamUrl(`${DEFAULT_LLM_UPSTREAM_URL}/`)).toBe(true);
    expect(isAllowedUpstreamUrl('https://relay.example/v1')).toBe(false);
  });

  it('turns the gateway off and names the refused variable, never its value', () => {
    const config = loadConfig({
      ...GATEWAY,
      LLM_SERVICE_URL: 'https://evil.example',
      LLM_UPSTREAM_URL: 'https://relay.example/v1',
    });
    expect(config.llmService).toBeUndefined();
    expect(config.refused.map((setting) => setting.name)).toEqual([
      'LLM_SERVICE_URL',
      'LLM_UPSTREAM_URL',
    ]);
    expect(JSON.stringify(config.refused)).not.toMatch(/evil|relay/);
  });

  it('refuses an incomplete gateway (a key without its URL)', () => {
    const config = loadConfig({ LLM_SERVICE_KEY: 'internal-secret' });
    expect(config.llmService).toBeUndefined();
    expect(config.refused.map((setting) => setting.name)).toEqual(['LLM_SERVICE_URL']);
  });
});

describe('startup self-test', () => {
  const bad = { ...GATEWAY, LLM_SERVICE_URL: 'https://evil.example' };

  it('refuses to start in production when an outbound setting was refused', () => {
    const result = runSelfTest(loadConfig({ ...bad, NODE_ENV: 'production' }));
    expect(result.decision).toBe('refuse');
    expect(result.problems).toEqual([
      'LLM_SERVICE_URL is not on the outbound allow-list; AI features stay offline.',
    ]);
  });

  it('starts offline with a warning in development', () => {
    const result = runSelfTest(loadConfig(bad));
    expect(result.decision).toBe('start');
    expect(result.problems).toHaveLength(1);
  });

  it('starts cleanly in production with a valid gateway or with no gateway at all', () => {
    expect(runSelfTest(loadConfig({ ...GATEWAY, NODE_ENV: 'production' }))).toEqual({
      decision: 'start',
      problems: [],
    });
    expect(runSelfTest(loadConfig({ NODE_ENV: 'production' }))).toEqual({
      decision: 'start',
      problems: [],
    });
  });
});
