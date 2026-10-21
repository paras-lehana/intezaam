/**
 * Tests for engine/rooms.ts and the guest-rooms money path end to end (CST-05, BUD-04).
 *
 * Responsibility: prove rooms are priced at the tier or destination rate with the right GST
 * slab, read against the guest-rooms line, and that a full plan carries the comparison
 * everywhere it matters for the Jaipur wedding and the Chennai 60th: the cost check reads
 * short, the risk radar names the gap, levers are offered, the hotel's payments add up to
 * the rooms bill and the plan facts say "short". Boundary: expected values come from the
 * engine's own pricing functions and tables.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_ROOM_NIGHTS, ROOM_RATE_PER_NIGHT_INR } from '../domain/catering.js';
import { GST_SERVICES } from '../domain/gst.js';
import { summarisePlanFacts } from '../engine/facts.js';
import { PERCENT } from '../engine/percent.js';
import { roomGstPct, roomsCostInr, roomsGapInr, roomsLineInr } from '../engine/rooms.js';
import { formatInr } from '../format.js';
import type { SampleId } from '../domain/samples.js';
import { normalised, planOf, sample, wedding } from './fixtures/engine-contexts.js';

describe('roomGstPct and roomsCostInr (CST-05)', () => {
  it('uses the low slab up to ₹7,500 a night and the high slab above it', () => {
    expect(roomGstPct(7_500)).toBe(GST_SERVICES['hotel-rooms-low'].ratePct);
    expect(roomGstPct(7_501)).toBe(GST_SERVICES['hotel-rooms-high'].ratePct);
  });

  it('prices rooms at the tier rate, or the destination rate for destination weddings', () => {
    const local = normalised(wedding());
    const rate = ROOM_RATE_PER_NIGHT_INR[local.tier];
    expect(roomsCostInr(local, 10)).toBe(
      Math.round(10 * DEFAULT_ROOM_NIGHTS * rate * (1 + roomGstPct(rate) / PERCENT)),
    );
    const away = normalised(wedding({ destination: true }));
    expect(roomsCostInr(away, 10)).toBeGreaterThan(roomsCostInr(local, 10));
    expect(roomsCostInr(local, 0)).toBe(0);
  });
});

describe('roomsLineInr and roomsGapInr', () => {
  it('reads the accommodation line, or 0 when the plan has none', () => {
    const { lines } = planOf(wedding()).budget;
    const line = lines.find((candidate) => candidate.category === 'accommodation');
    expect(roomsLineInr(lines)).toBe(line?.amountInr);
    expect(roomsGapInr(roomsLineInr(lines), lines)).toBe(0);
    expect(roomsLineInr(lines.filter((candidate) => candidate !== line))).toBe(0);
  });
});

/** The personas whose outstation guests need more rooms than their guest-rooms line holds. */
const ROOMS_SHORT_SAMPLES: readonly SampleId[] = ['jaipur-wedding', 'chennai-60th'];

describe.each(ROOMS_SHORT_SAMPLES)('the %s plan budgets its guest rooms', (id) => {
  const plan = planOf(sample(id));
  const { roomsInr } = plan.costCheck;
  const lineInr = roomsLineInr(plan.budget.lines);

  it('prices the rooms the headcount books and reads short against a guest-rooms line', () => {
    expect(plan.headcount.rooms).toBeGreaterThan(0);
    expect(roomsInr).toBe(roomsCostInr(normalised(sample(id)), plan.headcount.rooms));
    // BUD-04 gives every split a guest-rooms line once guests travel in (a 60th has none).
    expect(lineInr).toBeGreaterThan(0);
    expect(lineInr).toBeLessThan(roomsInr);
    expect(plan.costCheck.status).toBe('short');
  });

  it('raises the rooms gap as a risk and offers levers to close it', () => {
    const flagged = plan.risks.find((risk) => risk.id === 'risk-rooms-short');
    expect(flagged?.title).toBe(`Guest rooms look ${formatInr(roomsInr - lineInr)} short`);
    expect(plan.levers.length).toBeGreaterThan(0);
  });

  it('pays the hotel for the priced rooms, milestone by milestone', () => {
    const hotel = plan.vendors.find((vendor) => vendor.vendorType === 'hotel');
    expect(hotel?.budgetInr).toBe(roomsInr);
    expect(hotel?.payments.reduce((sum, payment) => sum + payment.amountInr, 0)).toBe(roomsInr);
  });

  it('tells the plan facts the rooms are short', () => {
    const facts = summarisePlanFacts(plan).map((fact) => fact.text);
    expect(facts.some((text) => text.startsWith('Guest rooms:') && text.includes('(short)'))).toBe(
      true,
    );
  });
});

describe('a switched-off guest-rooms line', () => {
  it('means guests book their own rooms, so the host pays for none', () => {
    const plan = planOf(wedding({ disabledCategories: ['accommodation'] }));
    expect(plan.costCheck.roomsInr).toBe(0);
    expect(plan.risks.some((risk) => risk.id === 'risk-rooms-short')).toBe(false);
  });
});
