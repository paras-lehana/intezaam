/**
 * Automated accessibility scans (axe-core, WCAG 2.0/2.1/2.2 A and AA).
 *
 * Responsibility: every route and every plan workspace tab, in both colour themes, with no serious or critical
 * violation. Boundary: scans settled pages only; behaviour is covered by journey.spec.ts.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { PLAN_TIMEOUT_MS, ROUTES, WORKSPACE_TABS } from './fixtures';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);

/**
 * Entrance animations fade text in; scan the settled page, not a half-transparent frame.
 * Only finite, clock-driven animations can finish, so looping and scroll-driven ones are ignored.
 */
async function settle(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .filter(
        (animation) =>
          animation.timeline === document.timeline &&
          animation.effect?.getComputedTiming().iterations !== Infinity,
      )
      .every((animation) => animation.playState === 'finished'),
  );
}

async function blockingViolations(page: Page): Promise<string[]> {
  await settle(page);
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return results.violations
    .filter((violation) => BLOCKING_IMPACTS.has(violation.impact ?? ''))
    .map((violation) => `${violation.id}: ${violation.help}`);
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    for (const route of ROUTES) {
      test(`${route} has no serious accessibility violations`, async ({ page }) => {
        await page.goto(route);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        expect(await blockingViolations(page)).toEqual([]);
      });
    }

    test('every plan workspace tab has no serious accessibility violations', async ({ page }) => {
      await page.goto('/plan');
      await page
        .getByRole('group', { name: /try a sample/i })
        .getByRole('button', { name: /jaipur/i })
        .click();
      await page
        .getByRole('button', { name: /plan my celebration/i })
        .first()
        .click();
      await expect(page.getByRole('tab', { name: WORKSPACE_TABS[0] })).toBeVisible({
        timeout: PLAN_TIMEOUT_MS,
      });
      for (const name of WORKSPACE_TABS) {
        await page.getByRole('tab', { name }).click();
        expect(await blockingViolations(page), `tab ${String(name)}`).toEqual([]);
      }
    });
  });
}
