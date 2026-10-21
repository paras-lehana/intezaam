/**
 * Prompt for GenAI job 2, the plan narrator (GENAI_ARCHITECTURE.md): explain the verdict and write
 * personalised ideas inside the limits code computed — one call per plan.
 *
 * Responsibility: give the model the numbered plan facts, the trace items and tasks it may
 * cite by id, and the idea constraints (diet, alcohol, season, setting, age band, access,
 * style, money), with the rules: numbers only from the facts, ideas without rupee amounts
 * or dates (cost is said with the band words saves / within / splurge; the app attaches the
 * band), no links, phones or business names. Boundary: builds strings; the faithfulness and
 * idea guards decide what survives.
 */
import { COST_BANDS, EFFORT_LEVELS, IDEA_CATEGORIES, SIGNAL_KEYS } from '../domain/ideas.js';
import type { LanguageCode } from '../domain/languages.js';
import type { PlanFact } from '../schemas/diff.js';
import { narrationModelOutputSchema } from '../schemas/model-outputs.js';
import type { Plan } from '../schemas/plan.js';
import { formatShortDate } from '../offline/describe-brief.js';
import { citedTrace } from '../offline/narrate.js';
import { nextTasks } from '../offline/task-order.js';
import type { IdeaConstraints } from './idea-constraints.js';
import { wrapUntrusted } from './prompt-boundary.js';
import { closedList, factsBlock, systemInstruction, type PromptPair } from './prompt-rules.js';

export interface NarrationPromptInput {
  readonly plan: Plan;
  readonly facts: readonly PlanFact[];
  readonly constraints: IdeaConstraints;
  readonly language: LanguageCode;
  readonly nonce: string;
}

/** The narrative cites the verdict's and the top risks' trace items (GENAI_ARCHITECTURE.md: top 5). */
/** Written for a constraint the context leaves open (no age band, no season). */
export const UNCONSTRAINED = 'any';

const MAX_TRACE_ITEMS = 8;
/** The three best next actions are picked from the most urgent tasks. */
const MAX_TASKS = 6;

const NARRATION_RULES: readonly string[] = [
  'Task: explain this plan to the family and suggest personalised ideas.',
  'headline: one line under 90 characters. summary: about 80 words on the verdict and the main trade-off.',
  'Every number you write must appear in the numbered plan facts. Do not compute new numbers.',
  'reasons: cite only traceId values from the trace list; actions: cite only taskId values from the task list (at most 3).',
  'ideas: 6 to 12 ideas across the categories. Never write rupee amounts, prices, percentages or dates in an idea. Speak about cost only with the words saves, within or splurge; the app attaches the cost band itself.',
  'Each idea must respect the constraints below. For a Jain menu never suggest meat, fish, egg, onion, garlic, potato or other root vegetables; for a vegetarian menu never suggest meat, fish or egg; suggest alcohol only when alcohol is allowed.',
  'youtubeQuery: a short English search phrase (under 60 characters) for a tutorial; never a link.',
  'Never include links, phone numbers, email addresses or business names.',
  closedList('Idea categories', IDEA_CATEGORIES),
  closedList('whyItFits signals', SIGNAL_KEYS),
  closedList('Effort levels', EFFORT_LEVELS),
  closedList('Cost words', COST_BANDS),
];

function traceLines(plan: Plan): string {
  return citedTrace(plan)
    .slice(0, MAX_TRACE_ITEMS)
    .map((item) => `${item.id}: ${item.title} — ${item.effect}`)
    .join('\n');
}

function taskLines(plan: Plan): string {
  return nextTasks(plan)
    .slice(0, MAX_TASKS)
    .map(
      (task) =>
        `${task.id}: ${task.title}${task.dueIso === undefined ? '' : ` (due ${formatShortDate(task.dueIso)})`}`,
    )
    .join('\n');
}

/**
 * Everything the narrator is shown about the plan: the numbered facts, the trace items and
 * the tasks it may cite. The faithfulness guard allows exactly the numbers in this block.
 * @example
 * narrationPlanBlock(plan, facts).startsWith('Plan facts:'); // true
 */
export function narrationPlanBlock(plan: Plan, facts: readonly PlanFact[]): string {
  return [
    'Plan facts:',
    factsBlock(facts),
    'Trace items you may cite:',
    traceLines(plan),
    'Tasks you may cite:',
    taskLines(plan),
  ].join('\n');
}

/**
 * The constraints as prompt lines (shared with the eval harness).
 * @example
 * constraintLines(constraints).includes('Menu: jain'); // true for a Jain menu
 */
export function constraintLines(constraints: IdeaConstraints): string {
  return [
    `Event: ${constraints.family} / ${constraints.kind}${constraints.tradition === undefined ? '' : ` / ${constraints.tradition}`}`,
    `Age band: ${constraints.ageBand ?? UNCONSTRAINED}; season: ${constraints.season ?? UNCONSTRAINED}; setting: ${constraints.setting}`,
    `Menu: ${constraints.menu}; Jain guests: ${String(constraints.jainGuests)}; halal: ${String(constraints.halal)}; satvik: ${String(constraints.satvik)}`,
    `Alcohol allowed: ${String(constraints.alcoholAllowed)}; money is tight: ${String(constraints.tight)}`,
    `Access needs: ${constraints.needs.join(', ') || 'none'}; style: ${constraints.styleTags.join(', ') || 'none'}`,
  ].join('\n');
}

/**
 * Builds the narration prompt (job 2). Plan text can echo what the user typed (the city),
 * so the facts, trace and tasks are fenced as data too.
 * @example
 * buildNarrationPrompt({ plan, facts, constraints, language: 'hi', nonce: 'a1b2c3d4' })
 *   .systemInstruction.includes('Hindi'); // true
 */
export function buildNarrationPrompt(input: NarrationPromptInput): PromptPair {
  return {
    systemInstruction: systemInstruction(
      NARRATION_RULES,
      narrationModelOutputSchema,
      input.language,
    ),
    prompt: [
      wrapUntrusted('PLAN', narrationPlanBlock(input.plan, input.facts), input.nonce),
      'Idea constraints:',
      constraintLines(input.constraints),
    ].join('\n'),
  };
}
