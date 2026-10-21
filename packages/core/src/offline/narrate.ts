/**
 * Offline twin of GenAI job 2 (plan narrator): the same `NarrationModelOutput` the model
 * returns, written from templates and the curated ideas library with no network.
 *
 * Responsibility: a headline and summary from the verdict's own reasons and the top risk;
 * up to five reasons, each the template sentence for its rule ("<rule title>: <effect>");
 * the three most urgent tasks as next actions; and eight ideas chosen from the library by
 * the code-computed constraints and the event's scope (its tradition, occasion and cut line). Every number comes from the plan, so the text is faithful
 * by construction — and the faithfulness guard uses these sentences as its fallbacks.
 * Boundary: pure; English templates (the provenance badge says "Offline planner").
 */
import { RULES } from '../domain/rules.js';
import { clipText } from '../format.js';
import { ideaConstraintsFor, type IdeaConstraints } from '../genai/idea-constraints.js';
import type { EventContext } from '../schemas/context.js';
import { MAX_HEADLINE_CHARS, MAX_LINE_CHARS, MAX_SUMMARY_CHARS } from '../schemas/limits.js';
import type { NarrationModelOutput } from '../schemas/model-outputs.js';
import type { PlanTask } from '../schemas/plan-time.js';
import type { Plan } from '../schemas/plan.js';
import type { TraceItem } from '../schemas/trace.js';
import { formatShortDate } from './describe-brief.js';
import { ideaScopeFor, type IdeaScope } from './ideas/idea-scope.js';
import { OFFLINE_IDEA_COUNT, selectIdeas } from './ideas/select-ideas.js';
import { nextTasks } from './task-order.js';

/** GENAI_ARCHITECTURE.md, job 2: the narrative cites the top five trace items and three next actions. */
const MAX_REASONS = 5;
const MAX_ACTIONS = 3;

/**
 * The template sentence for a trace item: its rule's title and what the rule did.
 * @example
 * reasonTemplate(traceItem); // 'Scale band: 300 guests is a large wedding.'
 */
export function reasonTemplate(item: TraceItem): string {
  return clipText(`${RULES[item.ruleId].title}: ${item.effect}`, MAX_LINE_CHARS);
}

/**
 * The template sentence for a next action.
 * @example
 * actionTemplate(task); // 'Book the venue (by 5 Nov 2026).'
 */
export function actionTemplate(task: PlanTask): string {
  const due = task.dueIso === undefined ? '' : ` (by ${formatShortDate(task.dueIso)})`;
  return clipText(`${task.title}${due}.`, MAX_LINE_CHARS);
}

/**
 * The trace items behind the verdict and the risks, in that order, each once.
 * @example
 * citedTrace(plan)[0]?.id === plan.verdict.money.traceIds[0]; // true
 */
export function citedTrace(plan: Plan): TraceItem[] {
  const ids = [
    ...plan.verdict.money.traceIds,
    ...plan.verdict.time.traceIds,
    ...(plan.verdict.funding?.traceIds ?? []),
    ...plan.risks.flatMap((risk) => risk.traceIds),
  ];
  const byId = new Map(plan.trace.map((item) => [item.id, item]));
  return [...new Set(ids)].flatMap((id) => {
    const item = byId.get(id);
    return item === undefined ? [] : [item];
  });
}

function summaryOf(plan: Plan): string {
  const verdict = plan.verdict;
  const [topRisk] = plan.risks;
  const parts = [
    verdict.money.reason,
    verdict.time.reason,
    verdict.funding?.reason,
    topRisk === undefined ? undefined : `Watch out: ${topRisk.title}. ${topRisk.fix}`,
  ];
  return clipText(parts.filter((part) => part !== undefined).join(' '), MAX_SUMMARY_CHARS);
}

function ideasFor(constraints: IdeaConstraints, scope: IdeaScope): NarrationModelOutput['ideas'] {
  return selectIdeas(constraints, OFFLINE_IDEA_COUNT, scope).map((idea) => ({
    category: idea.category,
    title: idea.title,
    description: idea.description,
    whyItFits: { signal: idea.why[0], text: idea.why[1] },
    effort: idea.effort,
    eco: idea.eco,
    youtubeQuery: idea.youtubeQuery,
  }));
}

/**
 * Narrates a plan with no model.
 * @example
 * narrateOffline(plan, context).ideas.length >= 6; // true
 */
export function narrateOffline(plan: Plan, context: EventContext): NarrationModelOutput {
  return {
    headline: clipText(plan.verdict.headline, MAX_HEADLINE_CHARS),
    summary: summaryOf(plan),
    reasons: citedTrace(plan)
      .slice(0, MAX_REASONS)
      .map((item) => ({ traceId: item.id, text: reasonTemplate(item) })),
    actions: nextTasks(plan)
      .slice(0, MAX_ACTIONS)
      .map((task) => ({ taskId: task.id, text: actionTemplate(task) })),
    ideas: ideasFor(ideaConstraintsFor(plan, context), ideaScopeFor(plan, context)),
  };
}
