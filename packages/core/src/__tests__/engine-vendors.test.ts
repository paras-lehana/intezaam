/**
 * Tests for engine/vendors.ts — vendor checklists (VEN-01…05).
 *
 * Responsibility: prove the vendor list follows functions, rites, officiants, tasks and
 * choices (alcohol, open air, public premises, crowd size, planner), drops the venue at home
 * and switched-off lines, is ordered by group; each vendor's budget slice adds up to its
 * line; book-by dates come from the vendor's task or its capped lead; questions add context;
 * and the Maps link never names a business. Boundary: expectations derive from the tables.
 */
import { describe, expect, it } from 'vitest';
import { VENDOR_PLAYBOOK } from '../domain/vendor-playbook.js';
import { VENDOR_GROUPS, VENDOR_PROFILES, type VendorType } from '../domain/vendors.js';
import { buildBudget } from '../engine/budget.js';
import { computeShares } from '../engine/budget-shares.js';
import { buildTimeline } from '../engine/timeline.js';
import { createTraceLog } from '../engine/trace.js';
import { buildVendors, neededVendors } from '../engine/vendors.js';
import { vendorChecklistSchema } from '../schemas/plan-people.js';
import type { EventContext } from '../schemas/context.js';
import {
  birthday,
  community,
  homePuja,
  normalised,
  undated,
  wedding,
} from './fixtures/engine-contexts.js';

function vendorsFor(context: EventContext): ReturnType<typeof buildVendors> {
  const ctx = normalised(context);
  const trace = createTraceLog();
  const { budget } = buildBudget(ctx, computeShares(ctx), trace);
  const timeline = buildTimeline(ctx, [], trace);
  return buildVendors(ctx, budget, timeline.tasks, trace);
}

function typesFor(context: EventContext): VendorType[] {
  const ctx = normalised(context);
  return neededVendors(ctx, buildTimeline(ctx, [], createTraceLog()).tasks);
}

describe('neededVendors (VEN-01)', () => {
  it('adds vendors for choices: alcohol, open air, public premises, crowds and planners', () => {
    expect(typesFor(wedding({ alcohol: true }))).toContain('bartender');
    expect(typesFor(wedding())).toEqual(expect.arrayContaining(['tent_house', 'generator']));
    const extras = community().community ?? { premises: 'private' as const, days: 1 };
    const open = typesFor(community({ community: { ...extras, premises: 'public' } }));
    expect(open).toEqual(expect.arrayContaining(['security', 'sanitation', 'first_aid']));
    expect(typesFor(wedding({ helpLevel: 'planner' }))).toContain('planner');
  });

  it('adds the officiant and the rites’ vendors for the tradition', () => {
    expect(typesFor(wedding())).toEqual(expect.arrayContaining(['pandit', 'band_baaja']));
    expect(typesFor(wedding({ tradition: 'muslim', functions: [] }))).toContain('qazi');
    expect(typesFor(wedding({ tradition: 'christian', functions: [] }))).toContain(
      'church_minister',
    );
  });

  it('drops the venue at home and vendors whose line is switched off', () => {
    expect(typesFor(homePuja())).not.toContain('venue');
    expect(typesFor(wedding({ disabledCategories: ['decor'] }))).not.toContain('decorator');
  });

  it('orders vendors by group', () => {
    const groups = typesFor(wedding()).map((v) => VENDOR_GROUPS.indexOf(VENDOR_PROFILES[v].group));
    expect([...groups].sort((a, b) => a - b)).toEqual(groups);
  });
});

describe('buildVendors', () => {
  it('builds schema-valid checklists from the playbook with a Maps search link', () => {
    for (const vendor of vendorsFor(wedding())) {
      expect(vendorChecklistSchema.safeParse(vendor).success).toBe(true);
      expect(vendor.mapsUrl).toContain('google.com/maps/search');
      expect(
        vendor.questions.slice(0, VENDOR_PLAYBOOK[vendor.vendorType].questions.length),
      ).toEqual([...VENDOR_PLAYBOOK[vendor.vendorType].questions]);
    }
  });

  it('splits each budget line among its vendors so the slices add up to the line', () => {
    const ctx = normalised(wedding());
    const { budget } = buildBudget(ctx, computeShares(ctx), createTraceLog());
    const vendors = vendorsFor(wedding());
    for (const line of budget.lines) {
      const sharing = vendors.filter((v) => v.budgetCategory === line.category);
      if (sharing.length === 0) continue;
      expect(sharing.reduce((sum, v) => sum + (v.budgetInr ?? 0), 0)).toBe(line.amountInr);
    }
  });

  it('gives a vendor with no budget line no payments of its own', () => {
    const sound = vendorsFor(wedding()).find((v) => v.vendorType === 'sound_light');
    expect([sound?.budgetInr, sound?.payments]).toEqual([undefined, []]);
  });

  it('books by the vendor’s task date, else its lead time, never before today', () => {
    const vendors = vendorsFor(wedding());
    const venue = vendors.find((v) => v.vendorType === 'venue');
    const ctx = normalised(wedding());
    const task = buildTimeline(ctx, [], createTraceLog()).tasks.find(
      (t) => t.vendorType === 'venue',
    );
    expect(venue?.bookByIso).toBe(task?.dueIso);
    vendors.forEach((v) => expect((v.bookByIso ?? '') >= ctx.todayIso).toBe(true));
  });

  it('leaves book-by dates out while the date is open', () => {
    expect(vendorsFor(undated(wedding())).every((v) => v.bookByIso === undefined)).toBe(true);
  });

  it('adds questions for Jain guests, halal meat, elders and rain', () => {
    const caterer = vendorsFor(wedding({ tradition: 'muslim', functions: [] })).find(
      (v) => v.vendorType === 'caterer',
    );
    expect(caterer?.questions.some((q) => q.includes('Jain'))).toBe(true);
    expect(caterer?.questions.some((q) => q.includes('halal'))).toBe(true);
    const venue = vendorsFor(wedding()).find((v) => v.vendorType === 'venue');
    expect(venue?.questions.some((q) => q.includes('elders'))).toBe(true);
    const decor = vendorsFor(birthday()).find((v) => v.vendorType === 'decorator');
    expect(decor?.questions.some((q) => q.includes('waterproof'))).toBe(true);
  });
});
