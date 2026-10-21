/**
 * Tests for the Google services catalog (the README table, /api/google/services and the
 * About page all read it).
 *
 * Responsibility: the catalog parses with the shared response schema, uses only the
 * `implemented` / `declined` vocabulary, carries env var NAMES only, gives every declined
 * service a reason, every implemented service points at files that exist in the repo, and
 * the README's table says exactly what the catalog says. Boundary: reads the file system only
 * to prove the code paths are real and the README agrees.
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GOOGLE_SERVICES } from '../google/service-catalog.js';
import {
  GOOGLE_SERVICE_STATUSES,
  googleServicesResponseSchema,
} from '../schemas/google-services.js';

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

describe('GOOGLE_SERVICES', () => {
  it('parses with the response schema served by the API', () => {
    expect(googleServicesResponseSchema.safeParse({ services: GOOGLE_SERVICES }).success).toBe(
      true,
    );
  });

  it('has unique ids and only the two status words', () => {
    const ids = GOOGLE_SERVICES.map((service) => service.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const service of GOOGLE_SERVICES)
      expect(GOOGLE_SERVICE_STATUSES).toContain(service.status);
  });

  it('backs every implemented service with code that exists', () => {
    const implemented = GOOGLE_SERVICES.filter((service) => service.status === 'implemented');
    expect(implemented.length).toBeGreaterThan(0);
    for (const service of implemented) {
      expect(service.codePaths.length).toBeGreaterThan(0);
      for (const path of service.codePaths)
        expect(existsSync(`${REPO_ROOT}${path}`), path).toBe(true);
    }
  });

  it('gives every declined service a reason and no code', () => {
    for (const service of GOOGLE_SERVICES.filter((entry) => entry.status === 'declined')) {
      expect(service.purpose.startsWith('Declined')).toBe(true);
      expect(service.codePaths).toEqual([]);
    }
  });

  it('exposes environment variable names, never values', () => {
    const serialised = JSON.stringify(GOOGLE_SERVICES);
    for (const service of GOOGLE_SERVICES) {
      for (const name of service.envVars) expect(name).toMatch(/^[A-Z][A-Z0-9_]*$/);
    }
    expect(serialised).not.toMatch(
      /AIza[0-9A-Za-z_-]{10,}|sk-[A-Za-z0-9]{10,}|https?:\/\/[^"]*key=/,
    );
  });

  it('names the Gemini models the server calls', () => {
    const gemini = GOOGLE_SERVICES.find((service) => service.id === 'gemini-api');
    expect(gemini?.name).toContain('gemini-3.5-flash-lite');
    expect(gemini?.status).toBe('implemented');
  });

  it('is the README table, row for row, with the counts the README states', () => {
    const readme = readFileSync(`${REPO_ROOT}README.md`, 'utf8');
    const rows = readme
      .split(/\r?\n/)
      .filter((line) => /^\| .+ \| (implemented|declined) +\|/.test(line))
      .map((line) => line.split('|').map((cell) => cell.trim()));
    expect(rows.map((cells) => [cells[1], cells[2]])).toEqual(
      GOOGLE_SERVICES.map((service) => [service.name, service.status]),
    );
    const count = (status: string): number =>
      GOOGLE_SERVICES.filter((service) => service.status === status).length;
    expect(readme).toContain(`${count('implemented')} implemented, ${count('declined')} declined`);
  });
});
