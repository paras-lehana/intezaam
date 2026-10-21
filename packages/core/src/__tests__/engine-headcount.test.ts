/**
 * Tests for engine/headcount.ts — attendance, plates, rooms and return gifts (HC-01…03).
 *
 * Responsibility: prove the attendance blend, guests per function, the 0/1-guest edges,
 * the plate guarantee and cook-for factors, rooms for outstation guests and the kids'-party
 * gift buffer, all derived from the domain constants. Boundary: unit tests.
 */
import { describe, expect, it } from 'vitest';
import { FUNCTION_PROFILES } from '../domain/functions.js';
import {
  ATTENDANCE_DESTINATION,
  ATTENDANCE_IN_TOWN,
  COOK_FOR_FACTOR,
  GUESTS_PER_ROOM,
  PLATE_GUARANTEE_FACTOR,
  RETURN_GIFT_BUFFER_PCT,
  WASTE_WARNING_FACTOR,
} from '../domain/headcount.js';
import {
  attendanceRate,
  buildHeadcount,
  expectedAt,
  expectedGuests,
  invitedAt,
  partyChildren,
} from '../engine/headcount.js';
import { createTraceLog } from '../engine/trace.js';
import { headcountSchema } from '../schemas/plan-people.js';
import { birthday, classified, homePuja, wedding } from './fixtures/engine-contexts.js';

describe('attendanceRate (HC-01)', () => {
  it('uses the in-town rate with no outstation guests and the destination rate for destinations', () => {
    expect(attendanceRate(classified(wedding({ outstationShare: 0 })))).toBe(
      ATTENDANCE_IN_TOWN.value,
    );
    expect(attendanceRate(classified(wedding({ destination: true })))).toBe(
      ATTENDANCE_DESTINATION.value,
    );
  });

  it('blends the two rates by the outstation share', () => {
    const share = wedding().outstationShare;
    expect(attendanceRate(classified(wedding()))).toBeCloseTo(
      ATTENDANCE_IN_TOWN.value * (1 - share) + ATTENDANCE_DESTINATION.value * share,
    );
  });
});

describe('guests per function', () => {
  it('uses the typed count, else the function’s default share', () => {
    const ctx = classified(wedding({ guestsByFunction: { sangeet: 120 } }));
    expect(invitedAt(ctx, 'sangeet')).toBe(120);
    expect(invitedAt(ctx, 'mehendi')).toBe(
      Math.round(ctx.guests * FUNCTION_PROFILES.mehendi.guestShare),
    );
  });

  it('never expects fewer than one guest, even for a party of one', () => {
    const one = classified(homePuja({ guests: 1 }));
    expect(expectedGuests(one)).toBe(1);
    expect(one.functions.every((kind) => expectedAt(one, kind) >= 1)).toBe(true);
  });
});

describe('partyChildren (HC-03)', () => {
  it('counts typed children capped at the guest list, and is null for adult events', () => {
    expect(partyChildren(classified(birthday()))).toBe(birthday().birthday?.kidsCount);
    expect(partyChildren(classified(birthday({ birthday: { kidsCount: 500 } })))).toBe(
      birthday().guests,
    );
    expect(partyChildren(classified(birthday({ birthday: {} })))).toBe(birthday().guests);
    expect(partyChildren(classified(wedding()))).toBeNull();
  });
});

describe('buildHeadcount', () => {
  it('derives plates, cook-for, waste and rooms from the expected count', () => {
    const ctx = classified(wedding());
    const headcount = buildHeadcount(ctx, createTraceLog());
    const expected = expectedGuests(ctx);
    const outstation = Math.round(ctx.guests * ctx.input.outstationShare);
    expect(headcountSchema.safeParse(headcount).success).toBe(true);
    expect(headcount).toMatchObject({
      invited: ctx.guests,
      expected,
      plateGuarantee: Math.round(expected * PLATE_GUARANTEE_FACTOR),
      cookFor: Math.round(expected * COOK_FOR_FACTOR),
      wasteWarningAbove: Math.round(expected * WASTE_WARNING_FACTOR),
      outstationGuests: outstation,
      rooms: Math.ceil(outstation / GUESTS_PER_ROOM),
    });
    expect(headcount.returnGiftsToOrder).toBeUndefined();
  });

  it('adds the return-gift buffer for a kids’ party and skips rooms without outstation guests', () => {
    const ctx = classified(birthday());
    const trace = createTraceLog();
    const headcount = buildHeadcount(ctx, trace);
    const children = partyChildren(ctx) ?? 0;
    expect(headcount.returnGiftsToOrder).toBe(
      Math.ceil(children * (1 + RETURN_GIFT_BUFFER_PCT.max / 100)),
    );
    expect(headcount.rooms).toBe(0);
    expect(trace.items().map((item) => item.ruleId)).toEqual(['HC-01', 'HC-02', 'HC-03']);
  });
});
