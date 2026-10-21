/**
 * Vitest configuration for the core package.
 *
 * Responsibility: run every `src/**\/__tests__` file in plain Node — core is pure (no DOM, no
 * network, no clock), so the node environment is enough — and enforce the coverage floor
 * (95/95/95/90, the core target in SPEC-MVP §A). Boundary: test tooling only.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/__tests__/**', 'src/index.ts'],
      reporter: ['text-summary', 'json-summary'],
      thresholds: { lines: 95, statements: 95, functions: 95, branches: 90 },
    },
  },
});
