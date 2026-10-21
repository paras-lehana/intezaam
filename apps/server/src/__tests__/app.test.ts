/**
 * Tests for the app chassis: health, the Google services catalog, the error envelope, body
 * limits, security headers, request ids and rate limiting (static web: static-web.test.ts).
 *
 * Responsibility: pin what every route shares. Boundary: supertest against buildApp with the
 * offline client and a fake clock; expected values come from core or the test config.
 */
import {
  GOOGLE_SERVICES,
  errorResponseSchema,
  googleServicesResponseSchema,
  healthResponseSchema,
} from '@intezaam/core';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { AI_REQUESTS_PER_MINUTE } from '../server.js';
import type { GenAiClient } from '../services/genai-client.js';
import { SECRETS, TEST_MODELS, TODAY, makeApp, weddingContext } from './helpers.js';

/** One minute, the rate-limit window. */
const MINUTE_MS = 60_000;

/** Just over the 64 kb JSON limit. */
const OVERSIZE_CHARS = 70 * 1024;

describe('health and catalog', () => {
  it('reports status, version and offline AI configuration', async () => {
    const res = await request(makeApp().app).get('/api/health');
    expect(res.status).toBe(200);
    expect(healthResponseSchema.parse(res.body)).toEqual({
      status: 'ok',
      version: '9.9.9',
      ai: { configured: false, models: [] },
    });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('names the models when the gateway client is configured', async () => {
    const res = await request(makeApp({ script: () => Promise.resolve('{}') }).app).get(
      '/api/health',
    );
    expect(res.body.ai).toEqual({ configured: true, models: [...TEST_MODELS] });
  });

  it('serves the core Google services catalog with variable names but no secret values', async () => {
    const res = await request(makeApp({ script: () => Promise.resolve('{}') }).app).get(
      '/api/google/services',
    );
    expect(res.status).toBe(200);
    expect(googleServicesResponseSchema.parse(res.body)).toEqual({
      services: JSON.parse(JSON.stringify(GOOGLE_SERVICES)),
    });
    expect(res.text).toContain('LLM_UPSTREAM_KEY');
    expect(res.text).not.toContain(SECRETS.internalKey);
    expect(res.text).not.toContain(SECRETS.upstreamKey);
  });
});

describe('error envelope', () => {
  it('returns 400 without echoing any input', async () => {
    const marker = 'INJECTED<script>alert(1)</script>';
    const res = await request(makeApp().app)
      .post('/api/plan')
      .send({ context: { ...weddingContext(), city: 7, [marker]: true }, todayIso: marker });
    expect(res.status).toBe(400);
    expect(errorResponseSchema.parse(res.body).error.code).toBe('VALIDATION_FAILED');
    expect(res.text).not.toContain('INJECTED');
  });

  it('shows the fixed copy of a custom rule, such as the planning window', async () => {
    const res = await request(makeApp().app)
      .post('/api/plan')
      .send({ context: { ...weddingContext(), dateIso: '2031-01-01' }, todayIso: TODAY });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('context.dateIso: Pick a date within');
  });

  it('rejects malformed JSON with the envelope', async () => {
    const res = await request(makeApp().app)
      .post('/api/plan/what-if')
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('returns 413 for bodies over the 64 kb limit', async () => {
    const res = await request(makeApp().app)
      .post('/api/brief')
      .send({ text: 'x'.repeat(OVERSIZE_CHARS), todayIso: TODAY });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('returns a 404 envelope for unknown API routes and non-GET requests outside the API', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: expect.any(String) } });
    expect((await request(app).post('/somewhere')).status).toBe(404);
  });

  it('turns unexpected exceptions into a generic 500 without leaking details', async () => {
    const throwing: GenAiClient = {
      configured: true,
      models: ['broken'],
      generateJson: () => Promise.reject(new Error('internal stack detail')),
      generateText: () => Promise.reject(new Error('internal stack detail')),
    };
    const { app, logs } = makeApp({ genai: throwing });
    const res = await request(app)
      .post('/api/plan')
      .send({ context: weddingContext(), todayIso: TODAY });
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL');
    expect(res.text).not.toContain('internal stack detail');
    expect(logs.some((line) => line.includes('"severity":"ERROR"'))).toBe(true);
  });
});

describe('security headers and request ids', () => {
  it('sends a strict CSP and hardening headers', async () => {
    const res = await request(makeApp().app).get('/api/health');
    const csp = String(res.headers['content-security-policy']);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).not.toContain('media-src');
    expect(res.headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(res.headers['strict-transport-security']).toContain('preload');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['permissions-policy']).toContain('microphone=()');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('echoes a safe inbound request id, replaces an unsafe one, and logs it without the IP', async () => {
    const { app, logs } = makeApp();
    const kept = await request(app).get('/api/health').set('X-Request-Id', 'trace-ABC-123');
    expect(kept.headers['x-request-id']).toBe('trace-ABC-123');
    const replaced = await request(app).get('/api/health').set('X-Request-Id', 'bad id;<script>');
    expect(replaced.headers['x-request-id']).toMatch(/^test-request-\d+$/);
    expect(
      logs.some(
        (line) =>
          line.includes('"requestId":"trace-ABC-123"') && line.includes('"clientSource":"direct"'),
      ),
    ).toBe(true);
    expect(logs.join('\n')).not.toContain('127.0.0.1');
  });
});

describe('rate limiting', () => {
  it('returns 429 once the AI bucket is empty and refills with time', async () => {
    const { app, clock } = makeApp();
    const statuses: number[] = [];
    for (let i = 0; i <= AI_REQUESTS_PER_MINUTE; i += 1)
      statuses.push((await request(app).post('/api/ask').send({})).status);
    expect(statuses.slice(0, AI_REQUESTS_PER_MINUTE).every((status) => status === 400)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
    clock.advance(MINUTE_MS);
    expect((await request(app).post('/api/ask').send({})).status).toBe(400);
  });

  it('evicts idle buckets without changing behaviour', async () => {
    const { app, clock } = makeApp();
    await request(app).get('/api/health');
    clock.advance(2 * MINUTE_MS);
    expect((await request(app).get('/api/health')).status).toBe(200);
  });
});
