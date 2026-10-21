/**
 * Tests for engine/functions.ts — function layout (FN-01, FN-02, FN-04).
 *
 * Responsibility: prove day offsets (defaults, tradition overrides, visarjan on the last
 * day), start and end times (Telugu near midnight, defaults otherwise), local names, rites,
 * budget slices and the rest-day check. Boundary: expectations come from FUNCTION_PROFILES,
 * TRADITION_PROFILES and CEREMONY_SEQUENCES.
 */
import { describe, expect, it } from 'vitest';
import { addDaysIso } from '../domain/calendar.js';
import { CEREMONY_SEQUENCES } from '../domain/ceremonies.js';
import { FUNCTION_PROFILES } from '../domain/functions.js';
import { sampleContext } from '../domain/samples.js';
import { TRADITION_PROFILES } from '../domain/traditions.js';
import { buildBudget } from '../engine/budget.js';
import { computeShares } from '../engine/budget-shares.js';
import {
  buildFunctions,
  type FunctionTiming,
  functionTimings,
  needsRestDay,
  traceRestDay,
} from '../engine/functions.js';
import { createTraceLog } from '../engine/trace.js';
import { planFunctionSchema } from '../schemas/plan-time.js';
import {
  classified,
  community,
  normalised,
  TODAY,
  undated,
  wedding,
} from './fixtures/engine-contexts.js';

describe('functionTimings (FN-01)', () => {
  it('uses default offsets and start times and dates each function', () => {
    const context = wedding();
    const timings = functionTimings(classified(context));
    const sangeet = timings.find((timing) => timing.kind === 'sangeet');
    expect(sangeet?.dayOffset).toBe(FUNCTION_PROFILES.sangeet.dayOffset);
    expect(sangeet?.startHhmm).toBe(FUNCTION_PROFILES.sangeet.defaultStartHhmm);
    expect(sangeet?.dateIso).toBe(
      addDaysIso(context.dateIso ?? '', FUNCTION_PROFILES.sangeet.dayOffset),
    );
  });

  it('applies tradition times, offsets and local names', () => {
    const telugu = functionTimings(classified(wedding({ tradition: 'telugu', functions: [] })));
    const muhurtham = telugu.find((timing) => timing.kind === 'wedding');
    expect(muhurtham?.startHhmm).toBe(TRADITION_PROFILES.telugu.ceremonyStartHhmm);
    expect(muhurtham?.endHhmm).toBe('04:30');
    expect(muhurtham?.label).toBe('Muhurtham');
    const bengali = functionTimings(classified(wedding({ tradition: 'bengali', functions: [] })));
    expect(bengali.find((timing) => timing.kind === 'reception')?.dayOffset).toBe(
      TRADITION_PROFILES.bengali.dayOffsets.reception,
    );
  });

  it('takes a function’s day from the tradition’s rites when there is no override', () => {
    const gujarati = functionTimings(classified(wedding({ tradition: 'gujarati', functions: [] })));
    const garba = CEREMONY_SEQUENCES.gujarati.find((step) => step.functionKind === 'sangeet');
    expect(gujarati.find((timing) => timing.kind === 'sangeet')?.dayOffset).toBe(garba?.dayOffset);
  });

  it('puts the visarjan on the last day of a multi-day programme', () => {
    const days = community().community?.days ?? 1;
    const visarjan = functionTimings(classified(community())).find((t) => t.kind === 'visarjan');
    expect(visarjan?.dayOffset).toBe(days - 1);
  });

  it('leaves functions undated when the date is open', () => {
    expect(functionTimings(classified(undated(wedding()))).every((t) => t.dateIso === null)).toBe(
      true,
    );
  });
});

describe('needsRestDay (FN-04)', () => {
  const at = (
    kind: FunctionTiming['kind'],
    dayOffset: number,
    startHhmm: string,
  ): FunctionTiming => ({
    kind,
    label: kind,
    dayOffset,
    dateIso: null,
    startHhmm,
    endHhmm: startHhmm,
    durationHours: FUNCTION_PROFILES[kind].durationHours,
  });

  it('flags a late sangeet the night before an early muhurat', () => {
    expect(needsRestDay([at('sangeet', -1, '19:00'), at('wedding', 0, '07:00')])).toBe(true);
  });

  it('is fine with a rest day, an evening ceremony, an early sangeet or a missing function', () => {
    expect(needsRestDay([at('sangeet', -2, '19:00'), at('wedding', 0, '07:00')])).toBe(false);
    expect(needsRestDay([at('sangeet', -1, '19:00'), at('wedding', 0, '19:00')])).toBe(false);
    expect(needsRestDay([at('sangeet', -1, '15:00'), at('wedding', 0, '07:00')])).toBe(false);
    expect(needsRestDay([at('wedding', 0, '07:00')])).toBe(false);
  });
});

describe('buildFunctions', () => {
  it('builds schema-valid cards with budget slices, rites and a rest-day check', () => {
    const ctx = normalised(wedding());
    const trace = createTraceLog();
    const { budget } = buildBudget(ctx, computeShares(ctx), trace);
    const result = buildFunctions(ctx, budget, trace);
    result.functions.forEach((fn) => expect(planFunctionSchema.safeParse(fn).success).toBe(true));
    const ceremony = result.functions.find((fn) => fn.functionKind === 'wedding');
    expect(ceremony?.budgetInr).toBe(
      budget.byFunction.find((fn) => fn.functionKind === 'wedding')?.amountInr,
    );
    expect(ceremony?.ceremonies).toEqual(
      CEREMONY_SEQUENCES['north-hindu']
        .filter((step) => step.functionKind === 'wedding')
        .map((step) => step.name),
    );
    expect(result.restDayTraceId).toBeNull();
  });

  it('lists no rites for an occasion without published ones', () => {
    const puja = normalised(community());
    const trace = createTraceLog();
    const cards = buildFunctions(puja, buildBudget(puja, computeShares(puja), trace).budget, trace);
    expect(cards.functions.every((fn) => fn.ceremonies.length === 0)).toBe(true);
  });

  it('gives the 60th two cards, its rites on the puja card, and cites the rites source', () => {
    const sixtieth = normalised(sampleContext('chennai-60th', TODAY));
    const trace = createTraceLog();
    const budget = buildBudget(sixtieth, computeShares(sixtieth), trace).budget;
    const cards = buildFunctions(sixtieth, budget, trace);
    expect(cards.functions.map((fn) => fn.functionKind)).toEqual(sixtieth.functions);
    const puja = cards.functions.find((fn) => fn.functionKind === 'puja');
    expect(puja?.ceremonies.some((rite) => rite.includes('Ugraratha Shanti'))).toBe(true);
    expect(cards.functions.find((fn) => fn.functionKind === 'meal')?.ceremonies).toEqual([]);
    const sequence = trace.items().find((item) => item.ruleId === 'FN-01');
    expect(sequence?.sourceIds).toContain('S-WIKI-SHASHTHIPURTI');
  });
});

describe('traceRestDay (FN-04)', () => {
  it('records FN-04 only when the rest day is missing', () => {
    const late: FunctionTiming = {
      kind: 'sangeet',
      label: 'Sangeet',
      dayOffset: -1,
      dateIso: null,
      startHhmm: '19:00',
      endHhmm: '23:00',
      durationHours: FUNCTION_PROFILES.sangeet.durationHours,
    };
    const early: FunctionTiming = { ...late, kind: 'wedding', dayOffset: 0, startHhmm: '07:00' };
    const trace = createTraceLog();
    expect(traceRestDay([late, early], trace)).toMatch(/^FN-04\./);
    expect(traceRestDay([early], trace)).toBeNull();
  });
});
