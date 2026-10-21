/**
 * Tests for engine/risks.ts — the risk radar and the readiness score (READY-01).
 *
 * Responsibility: prove risks are ordered blocker → high → medium → info (then by id), each
 * gets its own RISK trace item, and readiness adds four equal factors: permissions only when
 * none are needed, contingency at or above the family floor (with jewellery taken out of the
 * base), and time in hand by the time axis. Boundary: inputs come from the engine.
 */
import { describe, expect, it } from 'vitest';
import { buildPermissions } from '../engine/permissions.js';
import { buildReadiness, buildRisks } from '../engine/risks.js';
import { createTraceLog } from '../engine/trace.js';
import { readinessSchema } from '../schemas/plan-money.js';
import { RISK_SEVERITIES, riskSchema } from '../schemas/plan-safety.js';
import type { EventContext } from '../schemas/context.js';
import { coreOf, homePuja, normalised, wedding } from './fixtures/engine-contexts.js';
import { riskInputsOf } from './fixtures/engine-risk-inputs.js';

describe('buildRisks', () => {
  it('orders risks by severity then id, each with its own RISK trace item', () => {
    const trace = createTraceLog();
    const risks = buildRisks(riskInputsOf(wedding()), trace);
    expect(risks.length).toBeGreaterThan(1);
    const rank = (severity: (typeof RISK_SEVERITIES)[number]): number =>
      RISK_SEVERITIES.indexOf(severity);
    risks.slice(1).forEach((risk, index) => {
      const previous = risks[index];
      if (previous === undefined) return;
      const order = rank(previous.severity) - rank(risk.severity);
      expect(order < 0 || (order === 0 && previous.id < risk.id)).toBe(true);
    });
    const riskItems = trace.items().filter((item) => item.ruleId === 'RISK');
    expect(riskItems).toHaveLength(risks.length);
    for (const risk of risks) {
      expect(riskSchema.safeParse(risk).success).toBe(true);
      expect(risk.traceIds.at(-1)).toMatch(/^RISK\./);
    }
    expect(risks[0]?.severity).toBe('blocker');
  });
});

function readiness(
  context: EventContext,
  time: 'on-track' | 'compressed' | 'critical',
): ReturnType<typeof buildReadiness> {
  const ctx = normalised(context);
  const trace = createTraceLog();
  return buildReadiness(ctx, coreOf(context).budget, buildPermissions(ctx, trace), time, trace);
}

const points = (score: ReturnType<typeof buildReadiness>, key: string): number | undefined =>
  score.factors.find((factor) => factor.key === key)?.points;

describe('buildReadiness (READY-01)', () => {
  it('adds four equal factors to at most 100, with nothing booked yet', () => {
    const score = readiness(wedding(), 'on-track');
    expect(readinessSchema.safeParse(score).success).toBe(true);
    expect(score.factors.reduce((sum, factor) => sum + factor.max, 0)).toBe(100);
    expect(score.score).toBe(score.factors.reduce((sum, factor) => sum + factor.points, 0));
    expect(points(score, 'core-vendors')).toBe(0);
  });

  it('gives the permissions points only when no permission is needed', () => {
    const quiet = homePuja({
      venueSetting: 'home',
      sound: { amplified: false, endHhmm: '20:00', nearSilenceZone: false, crackers: false },
    });
    const ctx = normalised(quiet);
    const needed = buildPermissions(ctx, createTraceLog()).some((p) => p.required);
    const score = readiness(quiet, 'on-track');
    const max = score.factors.find((factor) => factor.key === 'permissions')?.max;
    expect(points(score, 'permissions')).toBe(needed ? 0 : max);
    expect(points(readiness(wedding(), 'on-track'), 'permissions')).toBe(0);
  });

  it('checks contingency against the family floor, jewellery included or not', () => {
    const max = readiness(wedding(), 'on-track').factors[0]?.max;
    expect(points(readiness(wedding(), 'on-track'), 'contingency')).toBe(max);
    const withJewellery = wedding({ toggles: { jewellery: true, planner: false } });
    expect(points(readiness(withJewellery, 'on-track'), 'contingency')).toBe(max);
    // A budget whose buffer was spent elsewhere falls below the floor.
    const ctx = normalised(wedding());
    const spent = coreOf(wedding()).budget;
    const noBuffer = {
      ...spent,
      lines: spent.lines.map((line) =>
        line.category === 'contingency' ? { ...line, shareBp: 0 } : line,
      ),
    };
    const trace = createTraceLog();
    const score = buildReadiness(ctx, noBuffer, [], 'on-track', trace);
    expect(points(score, 'contingency')).toBe(0);
    expect(points(score, 'permissions')).toBe(max);
  });

  it('scores time in hand by the time axis', () => {
    const full = points(readiness(wedding(), 'on-track'), 'time') ?? 0;
    expect(points(readiness(wedding(), 'compressed'), 'time')).toBe(Math.floor(full / 2));
    expect(points(readiness(wedding(), 'critical'), 'time')).toBe(0);
  });
});
