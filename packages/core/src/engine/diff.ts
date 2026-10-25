/**
 * Plan diff (what-if) — what changed between two plans.
 *
 * Responsibility: compare a plan before and after a change: verdict axes, the budget total
 * and every category that moved, risks that appeared or cleared, tasks added, removed,
 * re-statused or re-dated, vendors added or removed, and the cheapest fix the new plan
 * offers. Boundary: pure comparison; both plans come from buildPlan.
 */
import { BUDGET_CATEGORIES } from '../domain/budget-categories.js';
import { withoutUndefined } from '../objects.js';
import type { PlanDiff } from '../schemas/diff.js';
import type { Plan } from '../schemas/plan.js';
import type { Risk } from '../schemas/plan-safety.js';
import type { PlanTask } from '../schemas/plan-time.js';

type TaskChange = PlanDiff['taskChanges'][number];
type TaskSide = Pick<TaskChange, 'beforeStatus' | 'beforeDueIso' | 'afterStatus' | 'afterDueIso'>;

function riskRefs(risks: readonly Risk[], without: ReadonlySet<string>): PlanDiff['newRisks'] {
  return risks
    .filter((risk) => !without.has(risk.id))
    .map((risk) => ({ id: risk.id, title: risk.title, severity: risk.severity }));
}

function amountsOf(plan: Plan): Map<string, number> {
  return new Map(plan.budget.lines.map((line) => [line.category, line.amountInr] as const));
}

function budgetChanges(before: Plan, after: Plan): PlanDiff['budgetChanges'] {
  const was = amountsOf(before);
  const now = amountsOf(after);
  return BUDGET_CATEGORIES.flatMap((category) => {
    const beforeInr = was.get(category) ?? 0;
    const afterInr = now.get(category) ?? 0;
    return beforeInr === afterInr
      ? []
      : [{ category, beforeInr, afterInr, deltaInr: afterInr - beforeInr }];
  });
}

function dueOf(prefix: 'before' | 'after', task: PlanTask): TaskSide {
  const status = prefix === 'before' ? { beforeStatus: task.status } : { afterStatus: task.status };
  if (task.dueIso === undefined) return status;
  return prefix === 'before'
    ? { ...status, beforeDueIso: task.dueIso }
    : { ...status, afterDueIso: task.dueIso };
}

/** A status change outranks a date change; null when neither moved. */
function changeKind(old: PlanTask, task: PlanTask): 'status' | 'due' | null {
  if (old.status !== task.status) return 'status';
  return old.dueIso === task.dueIso ? null : 'due';
}

function taskChanges(before: Plan, after: Plan): TaskChange[] {
  const was = new Map(before.timeline.tasks.map((task) => [task.id, task] as const));
  const now = new Map(after.timeline.tasks.map((task) => [task.id, task] as const));
  const changes: TaskChange[] = [];
  for (const task of after.timeline.tasks) {
    const old = was.get(task.id);
    if (old === undefined) {
      changes.push({ id: task.id, title: task.title, change: 'added', ...dueOf('after', task) });
      continue;
    }
    const kind = changeKind(old, task);
    if (kind !== null) {
      changes.push({
        id: task.id,
        title: task.title,
        change: kind,
        ...dueOf('before', old),
        ...dueOf('after', task),
      });
    }
  }
  for (const task of before.timeline.tasks) {
    if (!now.has(task.id))
      changes.push({ id: task.id, title: task.title, change: 'removed', ...dueOf('before', task) });
  }
  return changes;
}

function vendorChanges(before: Plan, after: Plan): PlanDiff['vendorChanges'] {
  const was = new Set(before.vendors.map((vendor) => vendor.vendorType));
  const now = new Set(after.vendors.map((vendor) => vendor.vendorType));
  return [
    ...[...now]
      .filter((type) => !was.has(type))
      .map((vendorType) => ({ vendorType, change: 'added' as const })),
    ...[...was]
      .filter((type) => !now.has(type))
      .map((vendorType) => ({ vendorType, change: 'removed' as const })),
  ];
}

function cheapestFix(after: Plan): PlanDiff['cheapestFix'] {
  const best = after.levers.reduce<Plan['levers'][number] | null>(
    (top, lever) => (top === null || lever.savingInr > top.savingInr ? lever : top),
    null,
  );
  return best === null
    ? undefined
    : { leverId: best.id, title: best.title, savingInr: best.savingInr };
}

/**
 * The difference between two plans (before → after).
 * @example
 * diffPlans(plan, planWithFewerGuests).budgetChanges.length; // categories whose rupees moved
 */
export function diffPlans(before: Plan, after: Plan): PlanDiff {
  const money = { before: before.verdict.money.status, after: after.verdict.money.status };
  const time = { before: before.verdict.time.status, after: after.verdict.time.status };
  const fundingBefore = before.verdict.funding?.status;
  const fundingAfter = after.verdict.funding?.status;
  const hasFunding = fundingBefore !== undefined || fundingAfter !== undefined;
  const fix = cheapestFix(after);
  return {
    verdictChanged:
      money.before !== money.after || time.before !== time.after || fundingBefore !== fundingAfter,
    money,
    time,
    ...(hasFunding
      ? {
          funding: withoutUndefined({ before: fundingBefore, after: fundingAfter }),
        }
      : {}),
    totalDeltaInr: after.budget.totalInr - before.budget.totalInr,
    budgetChanges: budgetChanges(before, after),
    newRisks: riskRefs(after.risks, new Set(before.risks.map((risk) => risk.id))),
    resolvedRisks: riskRefs(before.risks, new Set(after.risks.map((risk) => risk.id))),
    taskChanges: taskChanges(before, after),
    vendorChanges: vendorChanges(before, after),
    ...(fix === undefined ? {} : { cheapestFix: fix }),
  };
}
