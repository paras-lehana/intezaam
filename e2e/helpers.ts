/**
 * Shared end-to-end steps: pin the browser's day, open a workspace tab, plan a built-in sample the
 * way a visitor does, and find what the selected tab shows.
 *
 * Responsibility: the few interactions every journey repeats, written once against accessible
 * names only, the visible-text lookup inside the selected tab, the decision items inside a named
 * section, and the panel an opened disclosure controls. Boundary: no assertions about plan
 * content; the specs own those.
 */
import { expect, type Locator, type Page } from '@playwright/test';
import { PINNED_TODAY_ISO, PLAN_TIMEOUT_MS } from './fixtures';

/** The form's submit button ("Plan my celebration"; the phone's sticky bar says "Update plan"). */
export const SUBMIT = /plan my celebration|update (my )?plan/i;

/** Midday, so the pinned day is the same calendar day in the browser's local time zone. */
const PINNED_TIME_OF_DAY = 'T12:00:00';

/**
 * Starts the browser's clock on a fixed day before the page loads, so a sample's relative date
 * — and every decision that depends on it — matches the plan expected.ts builds for that day.
 * Time still flows from there, so timers and animations run as usual.
 * @example
 * await pinToday(page);
 */
export async function pinToday(page: Page, todayIso: string = PINNED_TODAY_ISO): Promise<void> {
  // A date-time without an offset is local time, which the browser shares with the runner.
  await page.clock.install({ time: new Date(`${todayIso}${PINNED_TIME_OF_DAY}`) });
}

/**
 * Opens a workspace tab and waits until it is the selected one.
 * @example
 * await openTab(page, /^money/i);
 */
export async function openTab(page: Page, name: RegExp): Promise<void> {
  const tab = page.getByRole('tab', { name });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

/**
 * Fills the form from a "Try a sample" button, submits it and waits for the workspace.
 * @example
 * await planSample(page, /ganesh/i);
 */
export async function planSample(page: Page, sample: RegExp): Promise<void> {
  await page.goto('/plan');
  await page
    .getByRole('group', { name: /try a sample/i })
    .getByRole('button', { name: sample })
    .click();
  await page.getByRole('button', { name: SUBMIT }).first().click();
  await expect(page.getByRole('tab', { name: /^overview/i })).toBeVisible({
    timeout: PLAN_TIMEOUT_MS,
  });
}

/**
 * The first visible match for `text` in the selected workspace tab. Hidden tabs, folded
 * "Why this?" details and the collapsed form hold the same words, so the match is scoped
 * to what the visitor can actually see.
 * @example
 * await expect(inActiveTab(page, /noise/i)).toBeVisible();
 */
export function inActiveTab(page: Page, text: RegExp): Locator {
  return page.getByRole('tabpanel').getByText(text).filter({ visible: true }).first();
}

/**
 * A section of the selected tab, by its heading (each section is a region named by its h3).
 * @example
 * await expect(sectionIn(page, SECTIONS.dateNotes)).toBeVisible();
 */
export function sectionIn(page: Page, name: RegExp): Locator {
  return page.getByRole('tabpanel').getByRole('region', { name });
}

/**
 * The list item a section shows for one decision, found by its exact h4 title — a risk on the
 * radar or an item of the access plan — so fixed copy elsewhere on the tab never matches.
 * @example
 * await expect(sectionItem(page, SECTIONS.riskRadar, 'The venue is too small')).toHaveCount(0);
 */
export function sectionItem(page: Page, section: RegExp, title: string): Locator {
  return sectionIn(page, section)
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { level: 4, name: title, exact: true }) });
}

/**
 * The panel a disclosure button controls, once the button reports itself open.
 * @example
 * const panel = await openedPanel(page.getByRole('button', { name: /why this/i }).first());
 */
export async function openedPanel(button: Locator): Promise<Locator> {
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(button).toHaveAttribute('aria-controls', /.+/);
  const panelId = (await button.getAttribute('aria-controls')) ?? '';
  // An attribute selector, not "#id": React's generated ids hold characters "#" would need escaped.
  return button.page().locator(`[id="${panelId}"]`);
}
