/**
 * Static web serving — the built SPA on the same origin as the API.
 *
 * Responsibility: serve hashed assets with a year-long immutable cache, index.html
 * with no-cache (so deploys take effect immediately), and fall back to index.html
 * for client-side routes. Boundary: never handles /api paths, and without a web build
 * it registers no fallback, so navigations reach the app's 404 envelope.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import express, { type Express } from 'express';

/** One year: Vite fingerprints /assets/* file names, so their content never changes. */
const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';

/** Revalidate every time so a new deploy's index.html (and asset names) is picked up. */
const NO_CACHE = 'no-cache';

const ASSETS_SEGMENT = `${sep}assets${sep}`;

/** The SPA shell every client route answers with, plus its validator for 304 revalidation. */
interface IndexShell {
  readonly html: Buffer;
  readonly etag: string;
}

/**
 * Reads index.html once and fingerprints it; undefined when there is no web build.
 * The image copies the web dist at build time and every deploy restarts the server, so
 * the shell cannot change under a running process (locally: restart after a web rebuild).
 */
function loadIndexShell(indexPath: string): IndexShell | undefined {
  // Startup only: one synchronous check before the server listens, never per request.
  if (!existsSync(indexPath)) {
    return undefined;
  }
  const html = readFileSync(indexPath);
  // Weak: compression may gzip the body, and the gzip and identity bytes differ.
  return { html, etag: `W/"${createHash('sha256').update(html).digest('base64url')}"` };
}

/**
 * Mounts static serving and the SPA fallback for `webDistDir`.
 * @example
 * registerStaticWeb(app, config.webDistDir);
 */
export function registerStaticWeb(app: Express, webDistDir: string): void {
  app.use(
    express.static(webDistDir, {
      index: false,
      setHeaders(res, filePath) {
        res.setHeader(
          'Cache-Control',
          filePath.includes(ASSETS_SEGMENT) ? IMMUTABLE_CACHE : NO_CACHE,
        );
      },
    }),
  );
  const shell = loadIndexShell(join(webDistDir, 'index.html'));
  if (shell === undefined) {
    return;
  }
  app.use((req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path.startsWith('/api')) {
      next();
      return;
    }
    res.setHeader('Cache-Control', NO_CACHE);
    // Efficiency: a preset ETag stops Express hashing the body again, and a matching
    // If-None-Match gets an empty 304 from res.send.
    res.setHeader('ETag', shell.etag);
    res.type('html');
    // Efficiency: served from memory, so a navigation costs no filesystem call at all.
    res.send(shell.html);
  });
}
