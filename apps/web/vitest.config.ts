/**
 * Vitest configuration for the web SPA.
 *
 * Responsibility: run component tests in jsdom with jest-dom matchers, and fail the coverage
 * run below the web floor. Boundary: reuses the Vite config so tests transform JSX exactly the
 * way the production build does.
 */
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

/** The one stylesheet a test reads (tokens-contrast.test.ts). */
const TOKEN_SHEET = /styles[\\/]tokens\.css/;

/**
 * The coverage floor `npm run test:coverage` enforces. Source: the measured runs of 2026-10-21
 * (lines 97.8–98.5%, statements 95.7–96.6%, functions 97.7–98.3%, branches 86.2–87.7%), each
 * rounded down about three points so one new component does not fail the build while a real
 * slide does; branches sit lower because each JSX conditional counts both arms.
 */
const COVERAGE_THRESHOLDS = { lines: 95, statements: 93, functions: 95, branches: 83 } as const;

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/__tests__/setup.ts'],
      include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
      // Efficiency: stylesheets are not processed in tests, except the token sheet, which the
      // contrast test reads as text (`?raw`) to measure every colour pair.
      css: { include: [TOKEN_SHEET] },
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/__tests__/**', 'src/main.tsx'],
        reporter: ['text-summary', 'json-summary'],
        thresholds: COVERAGE_THRESHOLDS,
      },
    },
  }),
);
