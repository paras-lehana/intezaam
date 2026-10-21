/**
 * Persona journeys the core flows don't already cover: a parent's 60th organised from two cities, a
 * child's monsoon birthday, and the muhurat note a wedding family reads on the timeline.
 *
 * Responsibility: prove each persona's distinctive decision is visible to the visitor (priest lead time and
 * elder access; rain risk and return gifts, and no night-sound or elder items it does not need; the listed
 * muhurat date). Boundary: behaviour only, matched by accessible names and visible words, never by
 * implementation details; the words for a specific decision come from the engine's plan for the pinned day
 * (expected.ts).
 */
import { expect, test } from '@playwright/test';
import { ACCESS_NEED_LABELS, MUHURAT_DATES } from '@intezaam/core/domain';
import { accessItemIn, dateNoteIn, expectedPlan, NIGHT_SOUND_RISK_ID, riskIn } from './expected';
import { SECTIONS } from './fixtures';
import { inActiveTab, openTab, pinToday, planSample, sectionIn, sectionItem } from './helpers';

/** The fallback notes ("No curated muhurat dates…", "…not on the curated muhurat lists"). */
const UNLISTED_MUHURAT = /curated muhurat/i;

test.describe("Lakshmi and Ravi: Appa's 60th in Chennai", () => {
  test('the timeline books the priest early and the plan looks after the elders', async ({
    page,
  }) => {
    const elderSeating = accessItemIn(expectedPlan('chennai-60th'), 'elder-seating');
    await pinToday(page);
    await planSample(page, /60th|chennai/i);
    await openTab(page, /^timeline/i);
    await expect(inActiveTab(page, /priest|vadhyar|purohit/i)).toBeVisible();
    await openTab(page, /^safety/i);
    // Inside the access plan only: the tab's intro mentions elders for every plan.
    await expect(
      sectionIn(page, SECTIONS.accessPlan).getByLabel(ACCESS_NEED_LABELS.elderly),
    ).toBeChecked();
    await expect(sectionItem(page, SECTIONS.accessPlan, elderSeating.title)).toBeVisible();
  });
});

test.describe("Arjun: a 7th birthday in Bengaluru's monsoon", () => {
  test('the outdoor party carries a rain risk and the guest plan counts return gifts', async ({
    page,
  }) => {
    await planSample(page, /bengaluru|7th birthday/i);
    await expect(inActiveTab(page, /rain|monsoon/i)).toBeVisible();
    await openTab(page, /^people/i);
    await expect(inActiveTab(page, /return gift/i)).toBeVisible();
  });

  test('a garden party over by 8 pm, with no elders, gets no night-sound flag or elder seating', async ({
    page,
  }) => {
    const wedding = expectedPlan('jaipur-wedding');
    const party = expectedPlan('bengaluru-birthday');
    const nightSound = riskIn(wedding, NIGHT_SOUND_RISK_ID);
    const elderSeating = accessItemIn(wedding, 'elder-seating');
    // The control: the engine itself makes neither decision for this party.
    expect(party.risks.map((risk) => risk.id)).not.toContain(NIGHT_SOUND_RISK_ID);
    expect(party.accessibility.items.map((item) => item.id)).not.toContain('elder-seating');
    await pinToday(page);
    await planSample(page, /bengaluru|7th birthday/i);
    await openTab(page, /^safety/i);
    // The party's own risks and access items are on screen, so the absences below are real.
    for (const risk of party.risks) {
      await expect(sectionItem(page, SECTIONS.riskRadar, risk.title)).toBeVisible();
    }
    for (const item of party.accessibility.items) {
      await expect(sectionItem(page, SECTIONS.accessPlan, item.title)).toBeVisible();
    }
    await expect(sectionItem(page, SECTIONS.riskRadar, nightSound.title)).toHaveCount(0);
    await expect(sectionItem(page, SECTIONS.accessPlan, elderSeating.title)).toHaveCount(0);
  });
});

test.describe('Meena: wedding dates', () => {
  test('the timeline names a listed muhurat date and sends the family to their priest', async ({
    page,
  }) => {
    const muhurat = dateNoteIn(expectedPlan('jaipur-wedding'), 'muhurat');
    // On the pinned day the sample's date is a curated muhurat, so the note names a listed date.
    expect(MUHURAT_DATES.some((entry) => muhurat.text.includes(entry.dateIso))).toBe(true);
    expect(muhurat.text).toMatch(/family priest/i);
    await pinToday(page);
    await planSample(page, /jaipur/i);
    await openTab(page, /^timeline/i);
    const dates = sectionIn(page, SECTIONS.dateNotes);
    await expect(dates.getByText(muhurat.text, { exact: true })).toBeVisible();
    await expect(dates.getByText(UNLISTED_MUHURAT)).toHaveCount(0);
  });
});
