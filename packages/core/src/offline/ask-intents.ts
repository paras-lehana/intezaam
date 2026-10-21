/**
 * Rule-first answers for Ask (synthesis §5 job 5; bio-bandish assistant architecture,
 * 01 §3.9): common questions in English, Hindi or Hinglish are answered from the plan by
 * code, with no model call.
 *
 * Responsibility: recognise the intent — budget, next steps, vendors, permissions,
 * headcount, risks, time left, food — and compose a short answer from the plan's own
 * numbers and items, with the plan sections it used. Boundary: pure; every number comes
 * from the plan, so the answer is faithful by construction.
 */
import type { PlanSection } from '../domain/ideas.js';
import { clipText, formatInr, formatLakh } from '../format.js';
import { MAX_ANSWER_CHARS } from '../schemas/limits.js';
import type { Plan } from '../schemas/plan.js';
import { foldForMatch } from '../security/normalise.js';
import { formatShortDate } from './describe-brief.js';
import { nextTasks } from './task-order.js';

export const ASK_INTENTS = [
  'next-steps',
  'permissions',
  'vendors',
  'headcount',
  'risks',
  'time',
  'food',
  'budget',
] as const;

export type AskIntent = (typeof ASK_INTENTS)[number];

export interface IntentAnswer {
  readonly intent: AskIntent;
  readonly answer: string;
  readonly sources: PlanSection[];
}

/** Intent words (folded); checked in ASK_INTENTS order, first match wins. */
const INTENT_PATTERNS: Readonly<Record<AskIntent, RegExp>> = {
  'next-steps':
    /\b(?:next|what (?:should|do) (?:i|we) do|kya karna|agla|pehle kya|to ?do|start)\b|अगला|क्या करना/u,
  permissions: /\b(?:permission|permit|anumati|noc|police|loudspeaker|licen[cs]e|pandal)\b|अनुमति/u,
  vendors:
    /\b(?:vendors?|caterer|photographer|decorator|pandit|dj|venue|tent|book kab|when (?:should|to) book)\b/u,
  headcount:
    /\b(?:how many (?:people|guests|plates)|kitne log|plates?|rooms?|headcount|attendance)\b|मेहमान|कितने लोग/u,
  risks: /\b(?:risks?|problems?|go wrong|galat|rain|baarish|danger)\b|बारिश|खतरा/u,
  time: /\b(?:days left|kitne din|how (?:much|long) time|time left|timeline|kab tak|on time)\b|कितने दिन/u,
  food: /\b(?:food|khana|menu|jain|veg|counter)\b|खाना/u,
  budget:
    /\b(?:budget|kharcha|kharch|cost|paisa|paise|kitna lagega|money|afford|price)\b|बजट|खर्च/u,
};

/** Answers list at most three items so they stay under 120 words. */
const MAX_ITEMS = 3;

type Composer = (plan: Plan) => Omit<IntentAnswer, 'intent'>;

function topBudgetLines(plan: Plan): string {
  return [...plan.budget.lines]
    .sort((a, b) => b.amountInr - a.amountInr)
    .slice(0, MAX_ITEMS)
    .map((line) => `${line.label} ${formatLakh(line.amountInr)}`)
    .join(', ');
}

const COMPOSERS: Readonly<Record<AskIntent, Composer>> = {
  'next-steps': (plan) => ({
    answer: `Do these first: ${nextTasks(plan)
      .slice(0, MAX_ITEMS)
      .map(
        (task) =>
          `${task.title}${task.dueIso === undefined ? '' : ` (by ${formatShortDate(task.dueIso)})`}`,
      )
      .join('; ')}.`,
    sources: ['timeline'],
  }),
  permissions: (plan) => {
    const needed = plan.permissions.filter((permission) => permission.required);
    return {
      answer:
        needed.length === 0
          ? 'This plan needs no special permission. Check the Safety tab if you add amplified sound outdoors or a procession.'
          : `You need: ${needed
              .slice(0, MAX_ITEMS)
              .map((permission) => `${permission.title} from ${permission.authority}`)
              .join('; ')}. Verify with your local office.`,
      sources: ['permissions'],
    };
  },
  vendors: (plan) => ({
    answer: `Book first: ${plan.vendors
      .slice(0, MAX_ITEMS)
      .map(
        (vendor) =>
          `${vendor.label}${vendor.bookByIso === undefined ? '' : ` by ${formatShortDate(vendor.bookByIso)}`}`,
      )
      .join('; ')}. Each vendor card lists the questions to ask.`,
    sources: ['vendors'],
  }),
  headcount: (plan) => ({
    answer: `Of ${plan.headcount.invited} invited, expect about ${plan.headcount.expected}. Guarantee ${plan.headcount.plateGuarantee} plates and ask the caterer to cook for ${plan.headcount.cookFor}${plan.headcount.rooms > 0 ? `; book ${plan.headcount.rooms} rooms` : ''}.`,
    sources: ['headcount'],
  }),
  risks: (plan) => ({
    answer:
      plan.risks.length === 0
        ? 'No major risks were found for this plan.'
        : `Watch: ${plan.risks
            .slice(0, MAX_ITEMS)
            .map((risk) => `${risk.title} (${risk.severity}): ${risk.fix}`)
            .join(' ')}`,
    sources: ['risks'],
  }),
  time: (plan) => ({
    answer:
      plan.timeline.daysToEvent === null
        ? `Your date is not fixed yet. ${plan.verdict.time.reason}`
        : `${plan.timeline.daysToEvent} days to go. ${plan.verdict.time.reason}`,
    sources: ['timeline', 'verdict'],
  }),
  food: (plan) => ({
    answer: `Plan food for ${plan.headcount.plateGuarantee} plates; the catering line is ${formatInr(plan.costCheck.cateringLineInr)}. Counters: ${plan.food.counters.join(', ') || 'one main counter'}.`,
    sources: ['food', 'budget'],
  }),
  budget: (plan) => ({
    answer: `Your budget is ${formatLakh(plan.budget.totalInr)} (${formatInr(plan.budget.perGuestInr)} per guest). Biggest lines: ${topBudgetLines(plan)}. ${plan.verdict.money.reason}`,
    sources: ['budget', 'verdict'],
  }),
};

/**
 * The rule-based answer for a question, or undefined when no intent matches.
 * @example
 * answerByIntent('kitna kharcha hoga?', plan)?.sources; // ['budget', 'verdict']
 */
export function answerByIntent(question: string, plan: Plan): IntentAnswer | undefined {
  const folded = foldForMatch(question);
  const intent = ASK_INTENTS.find((candidate) => INTENT_PATTERNS[candidate].test(folded));
  if (intent === undefined) return undefined;
  const composed = COMPOSERS[intent](plan);
  return { intent, answer: clipText(composed.answer, MAX_ANSWER_CHARS), sources: composed.sources };
}
