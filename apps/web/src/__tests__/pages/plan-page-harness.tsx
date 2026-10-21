/**
 * Shared harness for the plan page tests.
 *
 * Responsibility: the Jaipur sample plan, a fetch that answers every request with the same
 * body, the page rendered at /plan, its plan heading and a pinned "today". Boundary:
 * test-only; "today" is pinned so the browser builds exactly the fixture plan.
 */
import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { PlanPage } from '../../pages/PlanPage';
import { samplePlan } from '../features/plan-fixtures';
import { TEST_TODAY_ISO, jsonResponse, renderAt } from '../helpers';

export const wedding = samplePlan('jaipur-wedding');

/**
 * Answers every request with a fresh copy of the same body (a Response body reads once).
 * @example
 * answerWith(narrationResponseFor(wedding.plan));
 */
export function answerWith(body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(() => Promise.resolve(jsonResponse(body))),
  );
}

/**
 * Renders the plan page at /plan.
 * @example
 * renderPage();
 */
export function renderPage(): void {
  renderAt(<PlanPage />, '/plan');
}

/**
 * The plan's own heading, named after the sample plan's title.
 * @example
 * expect(planHeading()).toHaveFocus();
 */
export function planHeading(): HTMLElement {
  return screen.getByRole('heading', { level: 2, name: wedding.plan.title });
}

/**
 * Pins "today" and clears the URL fragment before each test.
 * @example
 * beforeEach(resetPage);
 */
export function resetPage(): void {
  // Only Date is faked, so user-event's own timers keep running.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${TEST_TODAY_ISO}T10:00:00`));
  window.history.replaceState(null, '', '#');
}
