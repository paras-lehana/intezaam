/**
 * Shared test helpers: fetch stubbing, JSON responses, routed rendering and a fixed today.
 *
 * Responsibility: keep tests focused on behaviour by hiding fetch and router plumbing.
 * Boundary: test-only; never imported by application code.
 */
import type { ReactElement } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { type Mock, vi } from 'vitest';

export const HTTP_OK = 200;
export const HTTP_SERVER_ERROR = 500;

/** A fixed "today" for tests that date samples; the engine and samples take it as input. */
export const TEST_TODAY_ISO = '2026-10-20';

/**
 * A JSON Response exactly as the server would send it.
 * @example
 * jsonResponse({ services: [] });
 */
export function jsonResponse(body: unknown, status: number = HTTP_OK): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Replaces global fetch with a mock that answers with `responses` in order.
 * @example
 * const fetchMock = stubFetch(jsonResponse({ ok: true }));
 */
export function stubFetch(...responses: readonly Response[]): Mock<typeof fetch> {
  const fetchMock = vi.fn<typeof fetch>();
  for (const response of responses) fetchMock.mockResolvedValueOnce(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/**
 * Renders a tree inside a memory router at `path`.
 * @example
 * renderAt(<HomePage />, '/');
 */
export function renderAt(ui: ReactElement, path = '/'): RenderResult {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);
}
