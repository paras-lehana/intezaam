/**
 * Vitest configuration for the server workspace.
 *
 * Responsibility: run every `src/**\/__tests__` file in plain Node — the server is exercised
 * in-process with supertest, a scripted model and a fake clock, so no browser environment is
 * needed — and enforce the coverage floor (85/85/85/75). Boundary: test tooling only.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // index.ts only wires real I/O (listen, signals, stdout); the deploy smoke test covers it.
      exclude: ['src/**/__tests__/**', 'src/index.ts'],
      reporter: ['text-summary', 'json-summary'],
      thresholds: { lines: 85, statements: 85, functions: 85, branches: 75 },
    },
  },
});
