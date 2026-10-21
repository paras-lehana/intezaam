/**
 * Tests for engine/budget-shares.ts — the BUD-01…08 share pipeline.
 *
 * Responsibility: prove the table always sums to 10,000 bp; the base split, scale and
 * destination shifts, outstation rooms, the home party, priorities (with and without a cut,
 * and a cut too small to pay for them), switched-off lines, the planner, the contingency
 * floor (even when switched off) and jewellery behave as the rules say. Boundary: expected
 * shares come from the domain tables.
 */
import { describe, expect, it } from 'vitest';
import { BUDGET_CATEGORIES } from '../domain/budget-categories.js';
import {
  HOME_PARTY_VENUE_BP,
  JEWELLERY_SHARE_OF_TOTAL,
  OUTSTATION_ACCOMMODATION_DEFAULT_BP,
  PLANNER_DEFAULT_BP,
  PRIORITY_SHIFT_BP,
} from '../domain/budget-shifts.js';
import { BASIS_POINTS_TOTAL, BUDGET_SPLITS } from '../domain/budget-splits.js';
import { FAMILY_PROFILES } from '../domain/events.js';
import { computeShares } from '../engine/budget-shares.js';
import type { EventContext } from '../schemas/context.js';
import { birthday, classified, community, homePuja, wedding } from './fixtures/engine-contexts.js';

function sharesOf(context: EventContext): ReturnType<typeof computeShares> {
  return computeShares(classified(context));
}

const total = (shares: Record<string, number>): number =>
  Object.values(shares).reduce((a, b) => a + b, 0);

/** No priorities and nothing switched off, so a test sees one rule at a time. */
const plain: Pick<EventContext, 'priorities' | 'disabledCategories'> = {
  priorities: [],
  disabledCategories: [],
};

describe('computeShares', () => {
  it('always sums to 10,000 bp and never goes negative', () => {
    const contexts = [
      wedding(),
      wedding({ ...plain, guests: 60 }),
      wedding({ guests: 900, destination: true, toggles: { jewellery: true, planner: true } }),
      birthday(),
      birthday({ venueSetting: 'home' }),
      community(),
      homePuja({ disabledCategories: ['contingency', 'decor'] }),
    ];
    for (const context of contexts) {
      const { shares } = sharesOf(context);
      expect(total(shares)).toBe(BASIS_POINTS_TOTAL);
      BUDGET_CATEGORIES.forEach((category) => expect(shares[category]).toBeGreaterThanOrEqual(0));
    }
  });

  it('starts from the base split and records BUD-01 first', () => {
    const { shares, steps } = sharesOf(wedding(plain));
    expect(steps[0]?.ruleId).toBe('BUD-01');
    expect(shares.venue).toBe(BUDGET_SPLITS.wedding.shares.venue);
  });

  it('shifts small and large weddings and destination weddings', () => {
    const base = sharesOf(wedding(plain)).shares;
    const small = sharesOf(wedding({ ...plain, guests: 60 }));
    expect(small.shares.catering).toBeLessThan(base.catering);
    expect(small.steps.map((s) => s.ruleId)).toContain('BUD-02');
    expect(sharesOf(wedding({ ...plain, guests: 900 })).shares.catering).toBeGreaterThan(
      base.catering,
    );
    const away = sharesOf(wedding({ ...plain, destination: true }));
    expect(away.shares.venue).toBeGreaterThan(base.venue);
    expect(away.steps.map((s) => s.ruleId)).toContain('BUD-03');
  });

  it('raises guest rooms when most guests travel in', () => {
    const { shares, steps } = sharesOf(wedding({ ...plain, outstationShare: 0.8 }));
    expect(shares.accommodation).toBe(OUTSTATION_ACCOMMODATION_DEFAULT_BP);
    expect(steps.map((s) => s.ruleId)).toContain('BUD-04');
  });

  it('keeps a small venue share for a party at home', () => {
    const { shares, steps } = sharesOf(birthday({ ...plain, venueSetting: 'home' }));
    expect(shares.venue).toBe(HOME_PARTY_VENUE_BP);
    expect(steps.map((s) => s.ruleId)).toContain('BUD-08');
  });

  it('moves points into the priorities from the cut category first', () => {
    const base = sharesOf(wedding(plain)).shares;
    const cut = sharesOf(
      wedding({ priorities: ['catering'], cut: 'transport', disabledCategories: [] }),
    );
    expect(cut.shares.catering).toBe(base.catering + PRIORITY_SHIFT_BP);
    expect(cut.shares.transport).toBe(base.transport - PRIORITY_SHIFT_BP);
    const { cut: _none, ...uncut } = wedding({ priorities: ['decor'], disabledCategories: [] });
    const noCut = sharesOf(uncut);
    expect(noCut.shares.decor).toBe(base.decor + PRIORITY_SHIFT_BP);
    expect(noCut.shares.contingency).toBe(base.contingency);
  });

  it('empties a cut category that is too small and takes the rest pro rata', () => {
    const { shares } = sharesOf(birthday());
    expect(shares.photo_video).toBe(0);
    expect(total(shares)).toBe(BASIS_POINTS_TOTAL);
  });

  it('spreads switched-off lines and ignores priorities that are switched off', () => {
    const off = sharesOf(
      wedding({ priorities: ['decor'], disabledCategories: ['decor', 'gifts'] }),
    );
    expect([off.shares.decor, off.shares.gifts]).toEqual([0, 0]);
    expect(off.steps.find((s) => s.ruleId === 'BUD-05')).toBeUndefined();
  });

  it('adds the planner fee when a planner is hired, unless that line is off', () => {
    expect(sharesOf(wedding({ ...plain, helpLevel: 'planner' })).shares.planner).toBe(
      PLANNER_DEFAULT_BP,
    );
    const off = wedding({ priorities: [], helpLevel: 'planner', disabledCategories: ['planner'] });
    expect(sharesOf(off).shares.planner).toBe(0);
  });

  it('lowers a switched-off contingency only to its floor, never to zero', () => {
    const floor = FAMILY_PROFILES['family-function'].contingencyFloorBp;
    const { shares, steps } = sharesOf(homePuja({ disabledCategories: ['contingency'] }));
    expect(shares.contingency).toBe(floor);
    expect(steps.find((s) => s.ruleId === 'BUD-06')?.touched).toContain('contingency');
  });

  it('raises contingency to the family floor when the base split has none', () => {
    const { shares, steps } = sharesOf(birthday(plain));
    expect(shares.contingency).toBe(FAMILY_PROFILES.birthday.contingencyFloorBp);
    expect(steps.map((s) => s.ruleId)).toContain('BUD-07');
  });

  it('takes jewellery as 15% of the total, unless jewellery is switched off', () => {
    const toggles = { jewellery: true, planner: false };
    expect(sharesOf(wedding({ ...plain, toggles })).shares.jewellery).toBe(
      Math.round(JEWELLERY_SHARE_OF_TOTAL * BASIS_POINTS_TOTAL),
    );
    const off = wedding({ priorities: [], toggles, disabledCategories: ['jewellery'] });
    expect(sharesOf(off).shares.jewellery).toBe(0);
  });
});
