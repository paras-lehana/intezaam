/**
 * Crowd safety (CROWD-01…05) and the accessibility and elders plan (ACC-01…06).
 *
 * Responsibility: the NDMA mass-gathering checks this event triggers (always, by expected
 * footfall above 200 / 500 / 1,000, or by features such as a pandal or food stalls) and the
 * venue and day-of checks the ticked access needs add (ramps, accessible toilet, step-free
 * route, elder seating, first aid, lit paths). Boundary: checklists; risks.ts rates them.
 */
import { ACCESSIBILITY_ITEMS, accessItemsFor } from '../domain/accessibility.js';
import { CROWD_CHECK_IDS, CROWD_CHECKS, type CrowdTrigger } from '../domain/crowd.js';
import type { RuleId } from '../domain/rule-ids.js';
import type { AccessibilityPlan, CrowdPlan } from '../schemas/plan-safety.js';
import { TASK_CONDITION_CHECKS } from './task-conditions.js';
import type { TraceLog } from './trace.js';
import type { ClassifiedContext } from './types.js';

function triggered(trigger: CrowdTrigger, ctx: ClassifiedContext): boolean {
  if (trigger.kind === 'always') return true;
  if (trigger.kind === 'above') return ctx.footfall > trigger.footfall;
  const condition = trigger.feature === 'structure' ? 'temporary-structure' : 'food-stalls';
  return TASK_CONDITION_CHECKS[condition](ctx);
}

function ruleIds(ids: readonly RuleId[], trace: TraceLog): string[] {
  return [...new Set(ids)].map((ruleId) => trace.rule(ruleId));
}

/**
 * The crowd plan: footfall, class and the NDMA checks it triggers.
 * @example
 * buildCrowd(ganeshCtx, 'CTX-06.1', trace).checks.some((c) => c.id === 'ambulance'); // true (1,200 people)
 */
export function buildCrowd(
  ctx: ClassifiedContext,
  classTraceId: string,
  trace: TraceLog,
): CrowdPlan {
  const checks = CROWD_CHECK_IDS.filter((id) => triggered(CROWD_CHECKS[id].trigger, ctx)).map(
    (id) => ({
      id,
      ruleId: CROWD_CHECKS[id].ruleId,
      title: CROWD_CHECKS[id].title,
    }),
  );
  return {
    footfall: ctx.footfall,
    crowdClass: ctx.crowdClass,
    checks,
    traceIds: [
      classTraceId,
      ...ruleIds(
        checks.map((check) => check.ruleId),
        trace,
      ),
    ],
  };
}

/**
 * The accessibility and elders plan for the ticked needs (first aid and lit paths always).
 * @example
 * buildAccessibility(jaipurCtx, trace).items.some((i) => i.id === 'elder-seating'); // true
 */
export function buildAccessibility(ctx: ClassifiedContext, trace: TraceLog): AccessibilityPlan {
  const items = accessItemsFor(ctx.accessNeeds).map((id) => ({
    id,
    ruleId: ACCESSIBILITY_ITEMS[id].ruleId,
    title: ACCESSIBILITY_ITEMS[id].title,
    detail: ACCESSIBILITY_ITEMS[id].detail,
  }));
  return {
    needs: [...ctx.accessNeeds],
    items,
    traceIds: ruleIds(
      items.map((item) => item.ruleId),
      trace,
    ),
  };
}
