/**
 * Plan facts — the numbered statements GenAI prompts cite and Ask answers ground on.
 *
 * Responsibility: turn a plan into short, numbered facts (`F1`, `F2`, …) per plan section:
 * the verdict, every budget line, levers, cash flow, the next tasks, functions, vendors,
 * headcount, food, space, permissions, crowd, risks, accessibility and the community
 * contribution. Every number in a fact is copied from the plan, so a model that cites only
 * facts cannot invent a price or a date. Boundary: text only; the prompts live in genai/.
 */
import type { PlanSection } from '../domain/ideas.js';
import { clipText, formatInr } from '../format.js';
import type { PlanFact } from '../schemas/diff.js';
import { MAX_LINE_CHARS } from '../schemas/limits.js';
import type { Plan } from '../schemas/plan.js';
import { sharePercent } from './budget.js';
import { PAYMENT_SPLIT_LABEL } from './payments.js';
import { roomsGapInr, roomsLineInr } from './rooms.js';

/** The tasks most worth citing: everything due soonest, capped so prompts stay short. */
export const MAX_TASK_FACTS = 8;
const URGENT_FIRST: Readonly<Record<string, number>> = { urgent: 0, fallback: 0, 'do-now': 1 };

type Draft = readonly [PlanSection, string];

function verdictFacts(plan: Plan): Draft[] {
  const { verdict } = plan;
  const facts: Draft[] = [
    ['verdict', `Verdict: ${verdict.headline}.`],
    ['verdict', `Money: ${verdict.money.reason}`],
    ['verdict', `Time: ${verdict.time.reason}`],
    [
      'verdict',
      `A plan like this typically costs ${formatInr(verdict.estimateInr.low)}–${formatInr(verdict.estimateInr.high)}.`,
    ],
  ];
  if (verdict.funding !== undefined) facts.push(['verdict', `Funding: ${verdict.funding.reason}`]);
  return facts;
}

/** CST-04 and CST-05 as two facts, each with its own covered/short word. */
function costCheckFacts(plan: Plan): Draft[] {
  const { budget, costCheck } = plan;
  const food: Draft = [
    'budget',
    `Food bottom-up: ${formatInr(costCheck.cateringInr.mid)} against a food line of ${formatInr(costCheck.cateringLineInr)} (${costCheck.gapInr < 0 ? 'short' : 'covered'}).`,
  ];
  if (costCheck.roomsInr === 0) return [food];
  const rooms: Draft = [
    'budget',
    `Guest rooms: about ${formatInr(costCheck.roomsInr)} against a guest-rooms line of ${formatInr(roomsLineInr(budget.lines))} (${roomsGapInr(costCheck.roomsInr, budget.lines) < 0 ? 'short' : 'covered'}).`,
  ];
  return [food, rooms];
}

function moneyFacts(plan: Plan): Draft[] {
  const { budget } = plan;
  return [
    [
      'budget',
      `Total budget ${formatInr(budget.totalInr)} (${budget.source === 'user' ? 'yours' : 'our estimate'}), ${formatInr(budget.perGuestInr)} per guest.`,
    ],
    ...budget.lines.map((line): Draft => [
      'budget',
      `${line.label}: ${formatInr(line.amountInr)} (${sharePercent(line.shareBp)}).`,
    ]),
    ...costCheckFacts(plan),
    ...plan.levers.map((lever): Draft => [
      'levers',
      `${lever.title}: saves ${formatInr(lever.savingInr)}; money would read ${lever.newMoneyStatus}.`,
    ]),
    ...plan.payments.cashflow.map((month): Draft => [
      'payments',
      `${month.monthIso}: about ${formatInr(month.amountInr)} due to vendors (assumed ${PAYMENT_SPLIT_LABEL} schedule).`,
    ]),
  ];
}

function timeFacts(plan: Plan): Draft[] {
  const { timeline } = plan;
  const next = [...timeline.tasks]
    .filter((task) => task.status !== 'after-event')
    .sort(
      (a, b) =>
        (URGENT_FIRST[a.status] ?? 2) - (URGENT_FIRST[b.status] ?? 2) ||
        (a.dueIso ?? '').localeCompare(b.dueIso ?? ''),
    )
    .slice(0, MAX_TASK_FACTS);
  const days =
    timeline.daysToEvent === null
      ? 'Date not fixed yet.'
      : `${timeline.daysToEvent} days to the event.`;
  return [
    ['timeline', days],
    ...next.map((task): Draft => [
      'timeline',
      `${task.title}: ${task.dueIso === undefined ? 'undated' : `due ${task.dueIso}`} (${task.status}).`,
    ]),
    ...timeline.dateNotes.map((note): Draft => ['timeline', note.text]),
    ...plan.functions.map((fn): Draft => [
      'functions',
      `${fn.label}: ${fn.dateIso ?? 'date to fix'} ${fn.startHhmm}–${fn.endHhmm}, ${fn.guests} guests, ${formatInr(fn.budgetInr)}.`,
    ]),
  ];
}

function peopleFacts(plan: Plan): Draft[] {
  const { headcount, food, space } = plan;
  return [
    ...plan.vendors.map((vendor): Draft => [
      'vendors',
      `${vendor.label}: book by ${vendor.bookByIso ?? 'once the date is fixed'}${vendor.budgetInr === undefined ? '' : `, budget ${formatInr(vendor.budgetInr)}`}.`,
    ]),
    [
      'headcount',
      `${headcount.invited} invited, about ${headcount.expected} expected; guarantee ${headcount.plateGuarantee} plates, cook for ${headcount.cookFor}; ${headcount.rooms} rooms.`,
    ],
    [
      'food',
      `Plan ${food.totalKg.min}–${food.totalKg.max} kg of food; counters: ${food.counters.join(', ')}.`,
    ],
    [
      'space',
      space.capacity === undefined
        ? 'Venue capacity not checked (no floor area given).'
        : `The venue holds about ${space.capacity} guests: ${space.status}.`,
    ],
  ];
}

function permissionState(permission: Plan['permissions'][number]): string {
  if (permission.blocker) return 'the plan breaks this rule';
  return permission.required ? 'needed' : 'check if it applies';
}

function communityFacts(community: Plan['community']): Draft[] {
  if (community === undefined) return [];
  const share = community.contribution.perHouseholdInr;
  const volunteers = community.volunteers.reduce((sum, role) => sum + role.count, 0);
  const each = share === undefined ? 'households not given' : `${formatInr(share)} per household`;
  return [['community', `Contribution: ${each}; ${volunteers} volunteers.`]];
}

function safetyFacts(plan: Plan): Draft[] {
  const needs = plan.accessibility.needs;
  return [
    ...plan.permissions.map((permission): Draft => [
      'permissions',
      `${permission.title}: ${permissionState(permission)}.`,
    ]),
    [
      'crowd',
      `About ${plan.crowd.footfall} people (${plan.crowd.crowdClass} crowd): ${plan.crowd.checks.length} safety checks.`,
    ],
    ...plan.risks.map((risk): Draft => [
      'risks',
      `${risk.severity}: ${risk.title}. Fix: ${risk.fix}`,
    ]),
    [
      'accessibility',
      needs.length === 0 ? 'No special access needs given.' : `Access needs: ${needs.join(', ')}.`,
    ],
    ...communityFacts(plan.community),
  ];
}

/**
 * Numbered facts for a plan, in section order.
 * @example
 * summarisePlanFacts(plan)[0]; // { id: 'F1', section: 'verdict', text: 'Verdict: …' }
 */
export function summarisePlanFacts(plan: Plan): PlanFact[] {
  return [
    ...verdictFacts(plan),
    ...moneyFacts(plan),
    ...timeFacts(plan),
    ...peopleFacts(plan),
    ...safetyFacts(plan),
  ].map(([section, text], index) => ({
    id: `F${index + 1}`,
    section,
    text: clipText(text, MAX_LINE_CHARS),
  }));
}
