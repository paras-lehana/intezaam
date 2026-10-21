/**
 * Tests for static web serving: the SPA shell fallback, its cache headers and revalidation,
 * immutable hashed assets, and API-only mode when there is no web build.
 *
 * Responsibility: pin static-web.ts through the real app. Boundary: supertest against buildApp
 * with a temporary web build from helpers; expected bodies are read back from that build.
 */
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { errorResponseSchema } from '@intezaam/core';
import type { Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { makeApp, makeWebDist } from './helpers.js';

interface BuiltWeb {
  readonly app: Express;
  readonly indexPath: string;
  /** The index.html the app was started with. */
  readonly indexHtml: string;
}

/** Builds the app over a fresh temporary web build. */
function builtWeb(): BuiltWeb {
  const webDistDir = makeWebDist();
  const indexPath = join(webDistDir, 'index.html');
  const { app } = makeApp({ config: { webDistDir } });
  return { app, indexPath, indexHtml: readFileSync(indexPath, 'utf8') };
}

describe('static web with a build', () => {
  it('serves index.html for client routes with no-cache, and assets as immutable', async () => {
    const { app, indexHtml } = builtWeb();
    const page = await request(app).get('/plan');
    expect(page.status).toBe(200);
    expect(page.text).toBe(indexHtml);
    expect(page.headers['content-type']).toContain('text/html');
    expect(page.headers['cache-control']).toBe('no-cache');
    const asset = await request(app).get('/assets/app-abc123.js');
    expect(asset.headers['cache-control']).toContain('immutable');
  });

  it('answers a revalidation of the unchanged shell with an empty 304', async () => {
    const { app } = builtWeb();
    const first = await request(app).get('/plan');
    const etag = String(first.headers['etag']);
    expect(etag).not.toBe('undefined');
    const again = await request(app).get('/vendors').set('If-None-Match', etag);
    expect(again.status).toBe(304);
    expect(again.text).toBe('');
  });

  it('answers HEAD with the shell headers and no body', async () => {
    const { app, indexHtml } = builtWeb();
    const res = await request(app).head('/plan');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(Number(res.headers['content-length'])).toBe(Buffer.byteLength(indexHtml));
    expect(res.text).toBeUndefined();
  });

  it('serves the shell read at startup without touching the filesystem per request', async () => {
    const { app, indexPath, indexHtml } = builtWeb();
    rmSync(indexPath);
    const page = await request(app).get('/plan');
    expect(page.status).toBe(200);
    expect(page.text).toBe(indexHtml);
  });

  it('leaves non-GET requests and API paths to the 404 envelope', async () => {
    const { app } = builtWeb();
    const post = await request(app).post('/plan');
    expect(post.status).toBe(404);
    expect(errorResponseSchema.parse(post.body).error.code).toBe('NOT_FOUND');
    const api = await request(app).get('/api/nope');
    expect(api.status).toBe(404);
    expect(api.headers['content-type']).toContain('application/json');
  });
});

describe('static web without a build', () => {
  it('returns the 404 envelope for navigations', async () => {
    const res = await request(makeApp().app).get('/');
    expect(res.status).toBe(404);
    expect(errorResponseSchema.parse(res.body).error.code).toBe('NOT_FOUND');
  });
});
