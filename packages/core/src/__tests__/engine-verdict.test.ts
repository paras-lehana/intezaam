/**
 * Tests for engine/verdict.ts — the time axis, the funding axis and the verdict card.
 *
 * Responsibility: prove VER-T reads undated, past, critical (below the minimum workable
 * lead, exactly at it, and above it), compressed and on-track plans correctly; VER-F wording
 * for each funding status; and the assembled card's headline, estimate note and funding.
 * Boundary: expectations come from FAMILY_PROFILES and the engine's own outputs.
 */
import { describe, expect, it } from 'vitest';
import { FAMILY_PROFILES } from '../domain/events.js';
import { computeFunding } from '../engine/funding.js';
import { buildTimeline } from '../engine/timeline.js';
import { createTraceLog } from '../engine/trace.js';
import {
  assembleVerdict,
  FUNDING_LABELS,
  fundingVerdict,
  TIME_LABELS,
  timeVerdict,
} from '../engine/verdict.js';
import { MONEY_LABELS, type MoneyVerdict } from '../engine/verdict-money.js';
import { verdictSchema } from '../schemas/plan-money.js';
import type { EventContext } from '../schemas/context.js';
import {
  community,
  inDays,
  normalised,
  undated,
  wedding,
  withoutBudget,
} from './fixtures/engine-contexts.js';

function timeOf(context: EventContext): ReturnType<typeof timeVerdict> {
  const ctx = normalised(context);
  const trace = createTraceLog();
  return timeVerdict(ctx, buildTimeline(ctx, [], trace), trace);
}

const minimum = FAMILY_PROFILES.wedding.minWorkableLeadDays;

describe('timeVerdict (VER-T)', () => {
  it('is on track while the date is open and critical once it has passed', () => {
    expect(timeOf(undated(wedding())).status).toBe('on-track');
    expect(timeOf(wedding({ dateIso: inDays(-2) })).status).toBe('critical');
  });

  it('is critical below the minimum workable lead and not at it', () => {
    expect(timeOf(wedding({ dateIso: inDays(minimum - 1) })).status).toBe('critical');
    expect(timeOf(wedding({ dateIso: inDays(minimum) })).status).toBe('compressed');
  });

  it('is compressed when core tasks are late and on track when everything fits', () => {
    expect(timeOf(wedding()).status).toBe('compressed');
    const far = timeOf(wedding({ dateIso: inDays(400) }));
    expect([far.status, far.reason]).toEqual([
      'on-track',
      'Every core task fits its usual lead time.',
    ]);
  });

  it('cites its own trace item and the timeline', () => {
    const verdict = timeOf(wedding());
    expect(verdict.traceIds[0]).toMatch(/^VER-T\./);
    expect(verdict.traceIds).toHaveLength(2);
  });
});

describe('fundingVerdict (VER-F)', () => {
  it('words each status', () => {
    const funded = computeFunding(normalised(community()));
    if (funded === null) throw new Error('community funding expected');
    expect(fundingVerdict(funded, createTraceLog()).reason).toContain('Funded');
    const gap = { ...funded, status: 'gap' as const, gapInr: 1_000 };
    expect(fundingVerdict(gap, createTraceLog()).reason).toContain('Gap of');
    const surplus = { ...funded, status: 'surplus' as const, surplusInr: 500 };
    expect(fundingVerdict(surplus, createTraceLog()).reason).toContain('Surplus');
  });
});

describe('assembleVerdict', () => {
  const money: MoneyVerdict = {
    status: 'home-style',
    reason: 'Simple.',
    traceIds: ['VER-M.1'],
    level: 'community',
  };

  it('builds a schema-valid card whose headline names both axes', () => {
    const ctx = normalised(wedding());
    const time = timeOf(wedding());
    const verdict = assembleVerdict(ctx, money, time, null);
    expect(verdictSchema.safeParse(verdict).success).toBe(true);
    expect(verdict.headline).toBe(
      `${MONEY_LABELS[money.status]} budget · ${TIME_LABELS[time.status]} timeline`,
    );
    expect(verdict.money.status).toBe('home-style');
    expect(verdict.estimateInr).toEqual(ctx.estimate);
    expect(verdict.funding).toBeUndefined();
  });

  it('says when the budget is our estimate and adds the funding axis for community events', () => {
    const estimated = assembleVerdict(
      normalised(withoutBudget(wedding())),
      money,
      timeOf(wedding()),
      null,
    );
    expect(estimated.money.reason).toMatch(/^We estimated/);
    const ctx = normalised(community());
    const funds = computeFunding(ctx);
    if (funds === null) throw new Error('community funding expected');
    const funding = { funding: funds, verdict: fundingVerdict(funds, createTraceLog()) };
    const card = assembleVerdict(ctx, money, timeOf(community()), funding);
    expect(card.headline).toContain(FUNDING_LABELS[funds.status]);
    expect(card.funding?.status).toBe(funds.status);
  });
});
