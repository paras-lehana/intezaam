/**
 * GET /api/google/services — the catalog of Google services this app uses or declined.
 *
 * Responsibility: publish core's one catalog so the About page and the README table show the
 * same `implemented` / `declined` statuses the code proves. Boundary: serves the single core
 * constant; entries list environment variable NAMES only, never values (a test checks no
 * configured secret appears in the response).
 */
import { GOOGLE_SERVICES, type GoogleServicesResponse } from '@intezaam/core';
import type { Router } from 'express';

/**
 * Registers the service-catalog route.
 * @example
 * registerGoogleServices(api); // GET /api/google/services → { services: [...] }
 */
export function registerGoogleServices(router: Router): void {
  // Efficiency: the catalog is a constant, so the body is built once.
  const body: GoogleServicesResponse = { services: [...GOOGLE_SERVICES] };
  router.get('/google/services', (_req, res) => {
    res.json(body);
  });
}
