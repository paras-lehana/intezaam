/**
 * Tests for engine/cost-check.ts — bottom-up catering against the catering line, plus rooms.
 *
 * Responsibility: prove the cost check reuses the catering range, compares it with the line
 * (covered or short), prices rooms with the right GST slab, and explains every adjustment
 * in a note. Boundary: expected values come from the engine's own pricing functions.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_ROOM_NIGHTS, ROOM_RATE_PER_NIGHT_INR } from '../domain/catering.js';
import { GST_SERVICES } from '../domain/gst.js';
import { allInFactor, cateringRange } from '../engine/catering.js';
import { buildCostCheck, roomGstPct, roomsCostInr } from '../engine/cost-check.js';
import { createTraceLog } from '../engine/trace.js';
import { costCheckSchema } from '../schemas/plan-money.js';
import { birthday, community, normalised, wedding } from './fixtures/engine-contexts.js';

describe('roomGstPct and roomsCostInr (CST-05)', () => {
  it('uses the low slab up to ₹7,500 a night and the high slab above it', () => {
    expect(roomGstPct(7_500)).toBe(GST_SERVICES['hotel-rooms-low'].ratePct);
    expect(roomGstPct(7_501)).toBe(GST_SERVICES['hotel-rooms-high'].ratePct);
  });

  it('prices rooms at the tier rate, or the destination rate for destination weddings', () => {
    const local = normalised(wedding());
    const rate = ROOM_RATE_PER_NIGHT_INR[local.tier];
    expect(roomsCostInr(local, 10)).toBe(
      Math.round(10 * DEFAULT_ROOM_NIGHTS * rate * (1 + roomGstPct(rate) / 100)),
    );
    const away = normalised(wedding({ destination: true }));
    expect(roomsCostInr(away, 10)).toBeGreaterThan(roomsCostInr(local, 10));
    expect(roomsCostInr(local, 0)).toBe(0);
  });
});

const balanced = { level: 'standard', rooms: 0, money: 'balanced' } as const;

describe('buildCostCheck', () => {
  it('compares the bottom-up mid with the catering line', () => {
    const ctx = normalised(wedding());
    const range = cateringRange(ctx, 'standard');
    const covered = buildCostCheck(
      ctx,
      { ...balanced, cateringLineInr: range.high },
      createTraceLog(),
    );
    expect(costCheckSchema.safeParse(covered).success).toBe(true);
    expect(covered.cateringInr).toEqual(range);
    expect([covered.status, covered.gapInr]).toEqual(['covered', range.high - range.mid]);
    const short = buildCostCheck(
      ctx,
      { ...balanced, cateringLineInr: range.low },
      createTraceLog(),
    );
    expect([short.status, short.gapInr]).toEqual(['short', range.low - range.mid]);
  });

  it('reports service and GST once and traces CST-01, 02, 04 and 05', () => {
    const trace = createTraceLog();
    const check = buildCostCheck(
      normalised(wedding()),
      { ...balanced, cateringLineInr: 1, rooms: 3 },
      trace,
    );
    expect(check.taxesServicePct).toBeCloseTo((allInFactor(balanced.level) - 1) * 100);
    expect(check.roomsInr).toBeGreaterThan(0);
    expect(trace.items().map((item) => item.ruleId)).toEqual([
      'CST-01',
      'CST-02',
      'CST-04',
      'CST-05',
    ]);
    expect(check.notes.some((note) => note.includes('guest rooms'))).toBe(true);
    expect(check.notes.some((note) => note.includes('Reception'))).toBe(true);
    expect(check.notes.some((note) => note.includes('Jain'))).toBe(true);
  });

  it('words a short line the way the money verdict reads', () => {
    const ctx = normalised(wedding());
    const notesFor = (money: 'balanced' | 'lean', context = ctx): string =>
      buildCostCheck(
        context,
        { ...balanced, money, cateringLineInr: 1 },
        createTraceLog(),
      ).notes.join(' ');
    // The Jaipur sample already ranks catering, so it is not told to rank it again.
    expect(ctx.input.priorities).toContain('catering');
    expect(notesFor('balanced')).toContain('move about');
    expect(notesFor('balanced')).not.toContain('make catering a priority');
    const unranked = normalised(wedding({ priorities: ['decor'] }));
    expect(notesFor('balanced', unranked)).toContain('make catering a priority');
    expect(notesFor('lean')).toContain('see the levers');
  });

  it('adds the off-peak trace and note on an off-peak date', () => {
    const trace = createTraceLog();
    const check = buildCostCheck(
      normalised(birthday()),
      { ...balanced, cateringLineInr: 1 },
      trace,
    );
    expect(trace.items().some((item) => item.ruleId === 'CST-03')).toBe(true);
    expect(check.notes.some((note) => note.includes('Off-peak'))).toBe(true);
    expect(check.notes.some((note) => note.includes('party rate'))).toBe(true);
  });

  it('never flags community food short: the food-and-prasad line is the plan', () => {
    const ctx = normalised(community());
    const check = buildCostCheck(
      ctx,
      { level: 'community', rooms: 0, money: 'lean', cateringLineInr: 1 },
      createTraceLog(),
    );
    expect([check.status, check.gapInr, check.plates]).toEqual(['covered', 0, ctx.footfall]);
    expect(check.notes.some((note) => note.includes('prasad'))).toBe(true);
  });

  it('counts every serving at every function', () => {
    const ctx = normalised(birthday());
    const check = buildCostCheck(ctx, { ...balanced, cateringLineInr: 0 }, createTraceLog());
    expect(check.plates).toBeGreaterThan(0);
    expect(check.notes.some((note) => note.includes('Jain'))).toBe(false);
  });
});
