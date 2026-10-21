/**
 * Shared test helpers: fetch stubbing (immediate or released by the test), JSON responses,
 * routed rendering and a fixed today.
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
 * Replaces global fetch with one whose replies the test releases one at a time, by call order.
 * @example
 * const replies = deferredFetch();
 * replies.release(0, jsonResponse({ ok: true }));
 */
export function deferredFetch(): { release: (index: number, response: Response) => void } {
  const pending: ((response: Response) => void)[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(
      () =>
        new Promise<Response>((resolve) => {
          pending.push(resolve);
        }),
    ),
  );
  return { release: (index, response) => pending[index]?.(response) };
}

/**
 * Renders a tree inside a memory router at `path`.
 * @example
 * renderAt(<HomePage />, '/');
 */
export function renderAt(ui: ReactElement, path = '/'): RenderResult {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);
}
