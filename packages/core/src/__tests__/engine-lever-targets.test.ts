/**
 * Tests for engine/lever-targets.ts — the guest-list target behind LEV-01.
 *
 * Responsibility: prove each money model aims at its own target — wedding rows escape
 * Needs changes (food floor at 60% of event spend) or reach the next published row, a
 * bottom-up plan meets its estimate's low end, a short food line scales the list to fit —
 * and that party bands, committees and plans with nothing short get no target.
 * Boundary: expected values are recomputed from the engine's own helpers.
 */
import { describe, expect, it } from 'vitest';
import { CATERING_STRETCH_SHARE } from '../domain/costs.js';
import { cateringFloorInr } from '../engine/catering.js';
import { attendanceRate, expectedGuests } from '../engine/headcount.js';
import { guestTarget } from '../engine/lever-targets.js';
import { BAND_BASIS_GUESTS, weddingRow } from '../engine/money-bands.js';
import { eventSpendInr } from '../engine/verdict-wedding.js';
import {
  birthday,
  community,
  coreOf,
  homePuja,
  sample,
  wedding,
} from './fixtures/engine-contexts.js';

describe('guestTarget for wedding rows', () => {
  it('scales guests until the food floor is 60% of event spend when the money needs changes', () => {
    const core = coreOf(wedding({ city: 'Delhi', budgetInr: 300_000 }));
    expect(core.money.status).toBe('stretch');
    const spend = eventSpendInr(core.budget.lines);
    const expected = Math.floor(
      (CATERING_STRETCH_SHARE * spend * expectedGuests(core.ctx)) / cateringFloorInr(core.ctx),
    );
    expect(guestTarget(core)).toBe(Math.floor(expected / attendanceRate(core.ctx)));
  });

  it('aims at the next published row from home-style and lean', () => {
    const homeStyle = coreOf(wedding({ city: 'Delhi', budgetInr: 1_000_000 }));
    expect(homeStyle.money.status).toBe('home-style');
    const spend = eventSpendInr(homeStyle.budget.lines);
    const billable = Math.floor(
      (spend * BAND_BASIS_GUESTS) / weddingRow(homeStyle.ctx).row.budget.min,
    );
    expect(guestTarget(homeStyle)).toBe(Math.floor(billable / attendanceRate(homeStyle.ctx)));
    const lean = coreOf(sample('chennai-60th'));
    expect(lean.money.status).toBe('lean');
    expect(guestTarget(lean)).not.toBeNull();
  });

  it('fits the guest list to a short food line when the band itself is fine', () => {
    const core = coreOf(wedding());
    expect([core.money.status, core.costCheck.status]).toEqual(['balanced', 'short']);
    expect(guestTarget(core)).toBe(
      Math.floor(
        (core.ctx.guests * core.costCheck.cateringLineInr) / core.costCheck.cateringInr.mid,
      ),
    );
  });

  it('has no target when nothing is short', () => {
    const rich = coreOf(wedding({ budgetInr: 200_000_000 }));
    expect([rich.money.status, rich.costCheck.status]).toEqual(['premium', 'covered']);
    expect(guestTarget(rich)).toBeNull();
  });
});

describe('guestTarget for other money models', () => {
  it('meets the low end of a bottom-up estimate', () => {
    const core = coreOf(homePuja({ budgetInr: 5_000 }));
    expect(guestTarget(core)).toBe(
      Math.floor((core.ctx.guests * core.ctx.budgetInr) / core.ctx.estimate.low),
    );
  });

  it('never targets party bands or committees', () => {
    expect(guestTarget(coreOf(birthday({ budgetInr: 1_000 })))).toBeNull();
    expect(guestTarget(coreOf(community({ community: { premises: 'public', days: 1 } })))).toBe(
      null,
    );
  });
});
