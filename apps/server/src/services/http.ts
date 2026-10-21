/**
 * Shared HTTP type for adapters that call upstream services.
 *
 * Responsibility: name the `fetch` signature once so adapters can take it as an injected
 * dependency (tests pass a fake). Boundary: types only — no runtime code.
 */

/** The platform `fetch`, injected so tests never touch the network. */
export type Fetch = typeof fetch;
