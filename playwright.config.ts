/**
 * Playwright configuration — end-to-end journeys and axe accessibility scans.
 *
 * Responsibility: run the e2e suite at desktop size and at the 390×844 phone viewport against
 * the production build served by the real server (`npm start`), or against a deployed URL when
 * E2E_BASE_URL is set, so the same suite verifies the live deployment. Boundary: test tooling
 * only; the journeys live in e2e/.
 */
import { defineConfig, devices } from '@playwright/test';

/** Local server port — matches the container port. */
const LOCAL_PORT = 8080;

/**
 * Per journey: against a live deployment one step can wait out a full model attempt (the
 * server allows 45 s, DEFAULT_LLM_TIMEOUT_MS) before the answer renders, so a journey gets
 * twice that.
 */
const E2E_TEST_TIMEOUT_MS = 90_000;

/** Per assertion: one full model attempt (45 s) plus room for the page to render the answer. */
const E2E_EXPECT_TIMEOUT_MS = 60_000;

/** `npm start` serves an existing build, so two minutes covers even a cold first start. */
const SERVER_START_TIMEOUT_MS = 120_000;
const baseURL = process.env['E2E_BASE_URL'] ?? `http://localhost:${LOCAL_PORT}`;
const useLocalServer = process.env['E2E_BASE_URL'] === undefined;

export default defineConfig({
  testDir: 'e2e',
  timeout: E2E_TEST_TIMEOUT_MS,
  expect: { timeout: E2E_EXPECT_TIMEOUT_MS },
  fullyParallel: false,
  retries: process.env['CI'] === undefined ? 0 : 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // 390×844 is the phone viewport every user-facing change is verified at.
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  ...(useLocalServer
    ? {
        webServer: {
          command: 'npm start',
          url: `http://localhost:${LOCAL_PORT}/api/health`,
          reuseExistingServer: true,
          timeout: SERVER_START_TIMEOUT_MS,
          // Deterministic offline planner for local runs; live Gemini is covered by E2E_BASE_URL runs.
          env: { LLM_SERVICE_URL: '' },
        },
      }
    : {}),
});
