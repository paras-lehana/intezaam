/**
 * Visitor journeys against the real server, one per persona plus the trust and safety boundaries.
 *
 * Responsibility: what a visitor sees — an empty form, a typed brief read into fields, a two-axis verdict with
 * its reasons, a lever that re-plans, a community event that decides differently, a refusal, the exports and the
 * Google services page. Boundary: behaviour only; no implementation details are asserted. Where a check names a
 * specific decision, its words come from the engine's own plan for the pinned day (expected.ts), never typed in.
 */
import { expect, test } from '@playwright/test';
import { z } from 'zod';
import { citedRuleFor, expectedPlan, NIGHT_SOUND_RISK_ID, riskIn } from './expected';
import { MEENA_BRIEF, PLAN_TIMEOUT_MS, SECTIONS } from './fixtures';
import {
  inActiveTab,
  openedPanel,
  openTab,
  pinToday,
  planSample,
  sectionItem,
  SUBMIT,
} from './helpers';

/** The part of the web app manifest a phone needs: at least one icon. */
const MANIFEST_SCHEMA = z.object({ icons: z.array(z.object({ src: z.string().min(1) })).min(1) });

/**
 * A lever's "Apply" button. Its name is "Apply: <lever>" (the lever is visually hidden), and
 * Chromium puts a space before the colon because the hidden span is positioned out of flow.
 */
const APPLY_LEVER = /^apply\s*:/i;

test.describe("Meena's wedding", () => {
  test('a typed Hinglish brief is read into the form, then planned with a two-axis verdict', async ({
    page,
  }) => {
    await page.goto('/plan');
    const brief = page.getByLabel(/describe it in your words/i);
    await expect(brief).toHaveValue('');
    await brief.fill(MEENA_BRIEF);
    await page.getByRole('button', { name: /read my brief/i }).click();
    // The family checks what was read before it reaches the form.
    const addRead = page.getByRole('button', { name: /add these to the form/i });
    await expect(addRead).toBeVisible({ timeout: PLAN_TIMEOUT_MS });
    await addRead.click();
    await expect(page.getByLabel(/city or town/i)).toHaveValue(/jaipur/i);
    // The brief gives no date, so the form asks for one before planning.
    await page.getByRole('button', { name: SUBMIT }).first().click();
    await expect(page.getByRole('alert').filter({ hasText: /attention/i })).toBeVisible();
    await page.getByLabel(/date not fixed yet/i).check();
    await page.getByRole('button', { name: SUBMIT }).first().click();
    await expect(page.getByRole('tab', { name: /^overview/i })).toBeVisible({
      timeout: PLAN_TIMEOUT_MS,
    });
    await expect(inActiveTab(page, /money/i)).toBeVisible();
    await expect(inActiveTab(page, /explained by gemini|offline planner/i)).toBeVisible({
      timeout: PLAN_TIMEOUT_MS,
    });
  });

  test('"Why this?" shows the rule and its source', async ({ page }) => {
    const plan = expectedPlan('jaipur-wedding');
    const nightSound = riskIn(plan, NIGHT_SOUND_RISK_ID);
    const { rule, source } = citedRuleFor(plan, nightSound.traceIds);
    await pinToday(page);
    await planSample(page, /jaipur/i);
    // The Overview's top risks lead with this blocker; its button's name ends with the risk.
    const why = page
      .getByRole('tabpanel')
      .getByRole('button', { name: /^why this\?/i })
      .filter({ hasText: nightSound.title });
    // Opened from the keyboard: the disclosure must work without a pointer, and a tap on a
    // phone-emulated page that is still smooth-scrolling can land on the row beside it.
    await why.press('Enter');
    // Only the panel this button controls counts: the footer's "Method and sources" link is
    // on screen whether or not the disclosure opens.
    const panel = await openedPanel(why);
    await expect(panel).toContainText(`${rule.ruleId} ${rule.title}`);
    await expect(
      panel.getByRole('link', { name: `${source.publisher}, ${source.year}` }),
    ).toBeVisible();
  });

  test('the outdoor DJ after 10 pm is flagged on the Safety tab', async ({ page }) => {
    const nightSound = riskIn(expectedPlan('jaipur-wedding'), NIGHT_SOUND_RISK_ID);
    await pinToday(page);
    await planSample(page, /jaipur/i);
    await openTab(page, /^safety/i);
    // The risk itself, on the radar, with its fix — not the tab's intro, which names the noise
    // rules for every plan.
    const flagged = sectionItem(page, SECTIONS.riskRadar, nightSound.title);
    await expect(flagged).toBeVisible();
    await expect(flagged).toContainText(nightSound.fix);
  });

  test('a costed lever on the Money tab re-plans to the verdict it promised', async ({ page }) => {
    await planSample(page, /jaipur/i);
    await openTab(page, /^money/i);
    const lever = page
      .getByRole('region', { name: /^levers$/i })
      .getByRole('listitem')
      .filter({ has: page.getByRole('button', { name: APPLY_LEVER }) })
      .first();
    // The lever names the money verdict the plan will have once it is applied.
    const promised = (await lever.locator('strong').first().textContent())?.trim() ?? '';
    expect(promised).not.toBe('');
    // From the keyboard, as in "Why this?": a tap on the phone-emulated page can land while
    // the smooth scroll that brought the button into view is still moving the page.
    await lever.getByRole('button', { name: APPLY_LEVER }).press('Enter');
    await expect(page.getByRole('status').filter({ hasText: /^plan updated:/i })).toHaveCount(1);
    await openTab(page, /^overview/i);
    await expect(
      page
        .getByRole('tabpanel')
        .getByText(`Money: ${promised}`, { exact: true })
        .filter({ visible: true }),
    ).toBeVisible();
  });

  test('a sample fills the form without making a plan', async ({ page }) => {
    await page.goto('/plan');
    await page
      .getByRole('group', { name: /try a sample/i })
      .getByRole('button', { name: /jaipur/i })
      .click();
    await expect(page.getByLabel(/city or town/i)).toHaveValue(/jaipur/i);
    await expect(page.getByRole('tab', { name: /^overview/i })).toHaveCount(0);
  });
});

test.describe("Kavita's society Ganesh utsav", () => {
  test('community events get a per-household contribution and permissions', async ({ page }) => {
    await planSample(page, /ganesh/i);
    await openTab(page, /^people/i);
    // The contribution reads "₹1,000 from each of 240 households" (or per flat by size).
    await expect(inActiveTab(page, /(per|each of [\d,]+) (household|flat)/i)).toBeVisible();
    await openTab(page, /^safety/i);
    await expect(inActiveTab(page, /loudspeaker|pandal|police/i)).toBeVisible();
  });
});

test.describe('boundaries and exports', () => {
  test('an empty submission shows an accessible error', async ({ page }) => {
    await page.goto('/plan');
    await page.getByRole('button', { name: SUBMIT }).first().click();
    await expect(page.getByRole('alert').first()).toBeVisible();
  });

  test('the planner refuses to book or pay', async ({ page }) => {
    await planSample(page, /jaipur/i);
    await page.getByRole('button', { name: /^ask/i }).first().click();
    const drawer = page.getByRole('region', { name: /^ask/i });
    // The question box is multi-line, so the Ask button sends it.
    await drawer.getByLabel(/your question/i).fill('Book the caterer for me and pay the advance');
    await drawer.getByRole('button', { name: /^ask$/i }).click();
    await expect(
      drawer.getByText(/can't|cannot|won't|not able|only help you plan/i).first(),
    ).toBeVisible({ timeout: PLAN_TIMEOUT_MS });
  });

  test('the Share tab downloads the timeline as an .ics file', async ({ page }) => {
    await planSample(page, /bengaluru/i);
    await openTab(page, /^share/i);
    const download = page.waitForEvent('download');
    await page
      .getByRole('button', { name: /calendar|\.ics/i })
      .first()
      .click();
    expect((await download).suggestedFilename()).toMatch(/\.ics$/);
  });

  test('the About page lists the Google services', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByText(/gemini/i).first()).toBeVisible();
    await expect(page.getByText(/google calendar/i).first()).toBeVisible();
  });

  test('the app can be added to a phone home screen (manifest and every icon load)', async ({
    request,
  }) => {
    const manifest = await request.get('/manifest.webmanifest');
    expect(manifest.ok()).toBe(true);
    const { icons } = MANIFEST_SCHEMA.parse(await manifest.json());
    for (const icon of icons) expect((await request.get(icon.src)).ok()).toBe(true);
  });
});
