/**
 * Tests for engine/run-sheet.ts — the day-of run sheet (FN-03).
 *
 * Responsibility: prove each booked vendor's slot sits its arrival lead before the start,
 * slots are in time order, only booked vendors appear, vendors without a run-sheet slot are
 * skipped, the 10 pm stop appears only for open-air amplified sound that runs late, and the
 * owner follows the help level. Boundary: leads come from VENDOR_ARRIVAL_LEAD_MIN.
 */
import { describe, expect, it } from 'vitest';
import { VENDOR_ARRIVAL_LEAD_MIN } from '../domain/vendor-timing.js';
import type { VendorType } from '../domain/vendors.js';
import { addMinutes } from '../engine/clock.js';
import { functionTimings } from '../engine/functions.js';
import { buildRunSheet } from '../engine/run-sheet.js';
import { createTraceLog } from '../engine/trace.js';
import { runSheetSchema } from '../schemas/plan-time.js';
import type { EventContext } from '../schemas/context.js';
import { birthday, classified, community, homePuja, wedding } from './fixtures/engine-contexts.js';

function sheetFor(
  context: EventContext,
  booked: readonly VendorType[],
): ReturnType<typeof buildRunSheet> {
  const ctx = classified(context);
  return buildRunSheet(ctx, functionTimings(ctx), new Set(booked), createTraceLog());
}

describe('buildRunSheet', () => {
  it('places each booked vendor its arrival lead before the start, in time order', () => {
    const [party] = sheetFor(birthday(), ['decorator', 'caterer', 'photographer']);
    const start = functionTimings(classified(birthday()))[0]?.startHhmm ?? '';
    const decor = party?.slots.find((slot) => slot.vendorType === 'decorator');
    expect(decor?.atHhmm).toBe(addMinutes(start, -(VENDOR_ARRIVAL_LEAD_MIN.decorator ?? 0)));
    expect(party?.slots.map((slot) => slot.vendorType ?? 'start')).toEqual([
      'decorator',
      'caterer',
      'photographer',
      'start',
    ]);
    expect(runSheetSchema.safeParse(party).success).toBe(true);
  });

  it('shows only booked vendors and skips vendors without an arrival slot', () => {
    const [fundraiser] = sheetFor(community({ functions: ['fundraiser'] }), [
      'caterer',
      'invitations',
    ]);
    expect(fundraiser?.slots.map((slot) => slot.vendorType).filter(Boolean)).toEqual(['caterer']);
  });

  it('adds the 10 pm stop for open-air amplified sound that runs late, and not otherwise', () => {
    const sangeet = sheetFor(wedding(), ['dj_band']).find(
      (sheet) => sheet.functionKind === 'sangeet',
    );
    expect(sangeet?.slots.at(-1)?.atHhmm).toBe('22:00');
    const indoor = sheetFor(wedding({ venueSetting: 'indoor' }), ['dj_band']);
    expect(
      indoor.flatMap((sheet) => sheet.slots).some((slot) => slot.title.includes('10 pm')),
    ).toBe(false);
  });

  it('stops the music at the start when the function begins inside the ban', () => {
    const telugu = sheetFor(wedding({ tradition: 'telugu', functions: ['wedding'] }), []);
    const stop = telugu[0]?.slots.find((slot) => slot.title.includes('10 pm'));
    expect(stop?.atHhmm).toBe(telugu[0]?.slots.find((slot) => slot.owner === 'Hosts')?.atHhmm);
  });

  it('names the owner from the help level and dates each sheet when dated', () => {
    const [diy] = sheetFor(homePuja({ helpLevel: 'diy' }), ['pandit']);
    expect(diy?.slots.find((slot) => slot.vendorType === 'pandit')?.owner).toBe('You');
    const [planner] = sheetFor(homePuja({ helpLevel: 'planner' }), ['pandit']);
    expect(planner?.slots[0]?.owner).toBe('Planner');
    expect(diy?.dateIso).toBe(homePuja().dateIso);
  });
});
