/**
 * Test setup: registers jest-dom matchers and resets the DOM and stubs between tests.
 *
 * Responsibility: the shared environment for every web test. Boundary: no global fetch
 * mock here — each test stubs exactly the responses it needs; preferences stored by one
 * test (theme, motion) are cleared so tests never depend on order.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
  window.localStorage.clear();
  delete document.documentElement.dataset['theme'];
  delete document.documentElement.dataset['motion'];
});
