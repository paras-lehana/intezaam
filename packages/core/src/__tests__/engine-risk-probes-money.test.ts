/**
 * Tests for engine/risk-probes-money.ts — the food-line and guest-rooms-line gaps.
 *
 * Responsibility: prove each gap becomes a risk only when its own line is short, rated
 * medium beyond a tenth of the bottom-up cost and info below it, with the gap in the title
 * and both figures in the detail; a rooms gap never raises the food risk and the other way
 * round. Boundary: inputs come from riskInputsOf with only the line under test changed.
 */
import { describe, expect, it } from 'vitest';
import { roomsGapInr, roomsLineInr } from '../engine/rooms.js';
import { MONEY_PROBES } from '../engine/risk-probes-money.js';
import type { RiskInputs } from '../engine/risk-probes.js';
import { formatInr } from '../format.js';
import type { BudgetCategory } from '../domain/budget-categories.js';
import { birthday, sample, wedding } from './fixtures/engine-contexts.js';
import { riskFrom, riskInputsOf } from './fixtures/engine-risk-inputs.js';

const risk = (inputs: RiskInputs, id: string): ReturnType<typeof riskFrom> =>
  riskFrom(MONEY_PROBES, inputs, id);

/** A tenth of the cost is the medium/info boundary, so a twentieth sits safely below it. */
const SMALL_GAP_DIVISOR = 20;

const jaipur = riskInputsOf(wedding());

/** The inputs with one budget line set to an amount (the rest of the plan unchanged). */
function withLine(inputs: RiskInputs, category: BudgetCategory, amountInr: number): RiskInputs {
  const lines = inputs.budget.lines.map((line) =>
    line.category === category ? { ...line, amountInr } : line,
  );
  return { ...inputs, budget: { ...inputs.budget, lines } };
}

describe('food-line probe (CST-04)', () => {
  it('rates a short food line medium beyond 10% of the estimate and info below it', () => {
    expect(jaipur.costCheck.gapInr).toBeLessThan(0);
    expect(risk(jaipur, 'risk-catering-short')?.severity).toBe('medium');
    const mid = jaipur.costCheck.cateringInr.mid;
    const nearly = { ...jaipur.costCheck, gapInr: -Math.floor(mid / SMALL_GAP_DIVISOR) };
    expect(risk({ ...jaipur, costCheck: nearly }, 'risk-catering-short')?.severity).toBe('info');
  });

  it('stays silent when only the rooms make the check short', () => {
    const fed = { ...jaipur.costCheck, gapInr: 0 };
    expect(fed.status).toBe('short');
    expect(risk({ ...jaipur, costCheck: fed }, 'risk-catering-short')).toBeUndefined();
  });
});

describe('guest-rooms probe (CST-05)', () => {
  it('names the Jaipur rooms gap against the guest-rooms line', () => {
    const { roomsInr } = jaipur.costCheck;
    const gap = -roomsGapInr(roomsInr, jaipur.budget.lines);
    const flagged = risk(jaipur, 'risk-rooms-short');
    expect(gap).toBeGreaterThan(0);
    expect(flagged?.severity).toBe('medium');
    expect(flagged?.title).toBe(`Guest rooms look ${formatInr(gap)} short`);
    expect(flagged?.detail).toContain(formatInr(roomsInr));
    expect(flagged?.detail).toContain(formatInr(roomsLineInr(jaipur.budget.lines)));
    expect(flagged?.fix).toContain('night fewer');
  });

  it('flags the Chennai 60th, whose split had no guest-rooms line of its own', () => {
    const chennai = riskInputsOf(sample('chennai-60th'));
    expect(chennai.costCheck.roomsInr).toBeGreaterThan(0);
    expect(roomsLineInr(chennai.budget.lines)).toBeGreaterThan(0);
    expect(risk(chennai, 'risk-rooms-short')?.severity).toBe('medium');
  });

  it('reads info for a small gap and nothing once the line covers the rooms', () => {
    const { roomsInr } = jaipur.costCheck;
    const nearly = withLine(
      jaipur,
      'accommodation',
      roomsInr - Math.floor(roomsInr / SMALL_GAP_DIVISOR),
    );
    expect(risk(nearly, 'risk-rooms-short')?.severity).toBe('info');
    expect(risk(withLine(jaipur, 'accommodation', roomsInr), 'risk-rooms-short')).toBeUndefined();
  });

  it('points a destination wedding at rooms its venue package may include', () => {
    const away = riskInputsOf(wedding({ destination: true }));
    expect(risk(away, 'risk-rooms-short')?.detail).toContain('venue package');
    expect(risk(jaipur, 'risk-rooms-short')?.detail).not.toContain('venue package');
  });

  it('stays silent when no guest needs a room', () => {
    const party = riskInputsOf(birthday());
    expect(party.costCheck.roomsInr).toBe(0);
    expect(risk(party, 'risk-rooms-short')).toBeUndefined();
  });
});
