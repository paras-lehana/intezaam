/**
 * Rule-first answers for Ask (GENAI_ARCHITECTURE.md, job 5; rules
 * first, as in the owner's earlier planner): common questions in English, Hindi or Hinglish are answered from the plan by
 * code, with no model call.
 *
 * Responsibility: recognise the intent — late music, venue space, rain, next steps,
 * permissions, headcount, a vendor, risks, time left, food, money — most specific first,
 * and compose a short answer from the plan's own numbers and items, with the plan sections
 * it used; answers that depend on what the question names live in ask-answers.ts.
 * Boundary: pure; every number comes from the plan or the question, so the answer is
 * faithful by construction.
 */
import type { PlanSection } from '../domain/ideas.js';
import { clipText, formatInr } from '../format.js';
import { MAX_ANSWER_CHARS } from '../schemas/limits.js';
import type { Plan } from '../schemas/plan.js';
import { foldForMatch } from '../security/normalise.js';
import {
  type AskQuestion,
  budgetAnswer,
  type ComposedAnswer,
  MAX_ITEMS,
  namesVendor,
  soundAnswer,
  spaceAnswer,
  vendorsAnswer,
  weatherAnswer,
} from './ask-answers.js';
import { formatShortDate } from './describe-brief.js';
import { nextTasks } from './task-order.js';
import { tokenise } from './tokens.js';

/** Checked in this order, first match wins: specific questions before general ones. */
export const ASK_INTENTS = [
  'sound',
  'space',
  'weather',
  'next-steps',
  'permissions',
  'headcount',
  'vendors',
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

/** Music or sound named alongside a late hour ("DJ till 11:30", "gaane raat tak"). */
const SOUND_SOURCE = /\b(?:dj|music|band|dhol|speakers?|sound|gaana|gaane|baaja)\b|संगीत|गाना/u;
const LATE_HOUR =
  /\b(?:till|until|upto|late|raat|night|midnight|after|baje|pm)\b|\b\d{1,2}[:.]\d{2}\b|रात/u;
/** Words that are about the sound rules on their own. */
const SOUND_RULE = /\b(?:loudspeakers?|noise|volume|decibels?|amplified)\b|लाउडस्पीकर/u;

/** Intent words (folded); see ASK_INTENTS for the order. */
const INTENT_PATTERNS: Readonly<Record<Exclude<AskIntent, 'sound' | 'vendors'>, RegExp>> = {
  space:
    /\b(?:big enough|large enough|enough (?:space|room)|space|capacity|sq ?ft|square f(?:ee|oo)t|floor area|jagah|accommodate|fit in|fit into)\b|जगह/u,
  weather:
    /\b(?:rain|rains|raining|rainy|baarish|barish|monsoon|weather|mausam|storm)\b|बारिश|मौसम/u,
  'next-steps':
    /\b(?:next|what (?:should|do) (?:i|we) do|kya karna|agla|pehle kya|to ?do|start)\b|अगला|क्या करना/u,
  permissions: /\b(?:permission|permit|anumati|noc|police|licen[cs]e|pandal)\b|अनुमति/u,
  headcount:
    /\b(?:how many (?:people|guests|plates)|kitne log|plates?|rooms?|headcount|attendance)\b|मेहमान|कितने लोग/u,
  risks: /\b(?:risks?|problems?|go wrong|galat|danger)\b|खतरा/u,
  time: /\b(?:days left|kitne din|how (?:much|long) time|time left|timeline|kab tak|on time)\b|कितने दिन/u,
  food: /\b(?:food|khana|menu|jain|veg|counter)\b|खाना/u,
  budget:
    /\b(?:budget|kharcha|kharch|cost|paisa|paise|kitna lagega|money|afford|price|save|saving)\b|बजट|खर्च/u,
};

const GENERIC_VENDOR = /\b(?:vendors?|book kab|when (?:should|to) book)\b/u;

type Matcher = (question: AskQuestion) => boolean;

const MATCHERS: Readonly<Record<AskIntent, Matcher>> = {
  sound: ({ folded }) =>
    SOUND_RULE.test(folded) || (SOUND_SOURCE.test(folded) && LATE_HOUR.test(folded)),
  vendors: ({ folded, tokens }) => GENERIC_VENDOR.test(folded) || namesVendor(tokens),
  space: ({ folded }) => INTENT_PATTERNS.space.test(folded),
  weather: ({ folded }) => INTENT_PATTERNS.weather.test(folded),
  'next-steps': ({ folded }) => INTENT_PATTERNS['next-steps'].test(folded),
  permissions: ({ folded }) => INTENT_PATTERNS.permissions.test(folded),
  headcount: ({ folded }) => INTENT_PATTERNS.headcount.test(folded),
  risks: ({ folded }) => INTENT_PATTERNS.risks.test(folded),
  time: ({ folded }) => INTENT_PATTERNS.time.test(folded),
  food: ({ folded }) => INTENT_PATTERNS.food.test(folded),
  budget: ({ folded }) => INTENT_PATTERNS.budget.test(folded),
};

type Composer = (plan: Plan, question: AskQuestion) => ComposedAnswer;

const COMPOSERS: Readonly<Record<AskIntent, Composer>> = {
  sound: (plan) => soundAnswer(plan),
  space: spaceAnswer,
  weather: (plan) => weatherAnswer(plan),
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
  vendors: vendorsAnswer,
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
  budget: budgetAnswer,
};

/**
 * The rule-based answer for a question, or undefined when no intent matches.
 * @example
 * answerByIntent('kitna kharcha hoga?', plan)?.sources; // ['budget', 'verdict']
 */
export function answerByIntent(question: string, plan: Plan): IntentAnswer | undefined {
  const asked: AskQuestion = {
    folded: foldForMatch(question),
    tokens: tokenise(question).tokens,
  };
  const intent = ASK_INTENTS.find((candidate) => MATCHERS[candidate](asked));
  if (intent === undefined) return undefined;
  const composed = COMPOSERS[intent](plan, asked);
  return { intent, answer: clipText(composed.answer, MAX_ANSWER_CHARS), sources: composed.sources };
}
