/**
 * Risk radar (RISK) and readiness score (READY-01).
 *
 * Responsibility: run every risk probe, order the risks by severity (blocker, high, medium,
 * info — always shown as text, never colour alone) and give each a trace item; and score
 * readiness out of 100 from core vendors booked, permissions done, contingency intact and
 * time in hand. Boundary: aggregation; the probes hold the checks.
 */
import { BASIS_POINTS_TOTAL } from '../domain/budget-splits.js';
import { FAMILY_PROFILES } from '../domain/events.js';
import { MAX_RISKS, MAX_TRACE_REFS } from '../schemas/limits.js';
import {
  type PlanBudget,
  READINESS_FACTORS,
  type Readiness,
  type TimeStatus,
} from '../schemas/plan-money.js';
import type { Permission, Risk, RiskSeverity } from '../schemas/plan-safety.js';
import { PERCENT } from './percent.js';
import { type RiskInputs, PRIMARY_PROBES } from './risk-probes.js';
import { MONEY_PROBES } from './risk-probes-money.js';
import { MORE_PROBES } from './risk-probes-more.js';
import type { TraceLog } from './trace.js';
import type { ClassifiedContext } from './types.js';

const SEVERITY_ORDER: Readonly<Record<RiskSeverity, number>> = {
  blocker: 0,
  high: 1,
  medium: 2,
  info: 3,
};

/** READY-01: the four factors weigh the same and make up 100 points (grade D). */
const FACTOR_POINTS = PERCENT / READINESS_FACTORS.length;

/** Time in hand: full points on track, half when compressed, none when critical. */
const TIME_SHARE: Readonly<Record<TimeStatus, number>> = {
  'on-track': 1,
  compressed: 0.5,
  critical: 0,
};

/**
 * Every risk the probes find, most severe first, each with a RISK trace item.
 * @example
 * buildRisks(inputs, trace)[0]?.severity; // 'blocker' when outdoor music runs past 10 pm
 */
export function buildRisks(inputs: RiskInputs, trace: TraceLog): Risk[] {
  const drafts = [...PRIMARY_PROBES, ...MONEY_PROBES, ...MORE_PROBES]
    .map((probe) => probe(inputs))
    .filter((draft) => draft !== null)
    .sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.id.localeCompare(b.id),
    )
    .slice(0, MAX_RISKS);
  return drafts.map((draft) => {
    const id = trace.add({
      ruleId: 'RISK',
      inputs: [
        ['severity', draft.severity],
        ['rule', draft.ruleId],
      ],
      effect: `${draft.title}: rated ${draft.severity}.`,
    });
    return { ...draft, traceIds: [...draft.traceIds, id].slice(-MAX_TRACE_REFS) };
  });
}

/**
 * READY-01: how ready the plan is, out of 100.
 * @example
 * buildReadiness(ctx, budget, permissions, 'on-track', trace).score; // 75 before any booking
 */
export function buildReadiness(
  ctx: ClassifiedContext,
  budget: PlanBudget,
  permissions: readonly Permission[],
  time: TimeStatus,
  trace: TraceLog,
): Readiness {
  const required = permissions.filter((permission) => permission.required).length;
  const contingencyBp = budget.lines.find((line) => line.category === 'contingency')?.shareBp ?? 0;
  const floorBp = FAMILY_PROFILES[ctx.family].contingencyFloorBp;
  // With jewellery on, the floor applies to the core 85%, so compare against the core share.
  const coreShareBp =
    BASIS_POINTS_TOTAL - (budget.lines.find((line) => line.category === 'jewellery')?.shareBp ?? 0);
  const contingencyOk = contingencyBp * BASIS_POINTS_TOTAL >= floorBp * coreShareBp;
  const factors = [
    { key: 'core-vendors' as const, label: 'Core vendors booked (none marked yet)', points: 0 },
    {
      key: 'permissions' as const,
      label: required === 0 ? 'No permissions needed' : `${required} permissions to get`,
      points: required === 0 ? FACTOR_POINTS : 0,
    },
    {
      key: 'contingency' as const,
      label: contingencyOk ? 'Contingency at or above its floor' : 'Contingency below its floor',
      points: contingencyOk ? FACTOR_POINTS : 0,
    },
    {
      key: 'time' as const,
      label: `Time in hand: ${time}`,
      points: Math.floor(FACTOR_POINTS * TIME_SHARE[time]),
    },
  ].map((factor) => ({ ...factor, max: FACTOR_POINTS }));
  const score = factors.reduce((sum, factor) => sum + factor.points, 0);
  const id = trace.add({
    ruleId: 'READY-01',
    inputs: factors.map((factor) => [factor.key, `${factor.points}/${factor.max}`] as const),
    effect: `Readiness ${score} of 100: book core vendors and finish permissions to raise it.`,
  });
  return { score, factors, traceIds: [id] };
}
