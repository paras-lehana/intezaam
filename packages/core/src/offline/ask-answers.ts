/**
 * Question-aware answers for Ask: the intents whose answer depends on what the question
 * names — a vendor, a function, a guest count, late music or rain (GENAI_ARCHITECTURE.md, job 5).
 *
 * Responsibility: answer a named vendor from its own card (book-by date, budget, payments
 * or the questions to ask); late or loud music from the night-sound permission and its
 * risk (PERM-02); "is the venue big enough" from the space check (SPACE-01); rain from the
 * rain risk (CTX-07) and the tent card; and a money question that names a function from
 * the lever that drops it (LEV-04). Boundary: pure; every number comes from the plan or
 * from the question itself.
 */
import { CATEGORY_PROFILES } from '../domain/budget-categories.js';
import type { PlanSection } from '../domain/ideas.js';
import { SPACE_LAYOUT_PROFILES, USABLE_FLOOR_SHARE } from '../domain/space.js';
import { VENDOR_PROFILES } from '../domain/vendors.js';
import { MONEY_LABELS } from '../engine/verdict-labels.js';
import { formatInr, formatLakh } from '../format.js';
import type { PaymentMilestone } from '../schemas/plan-money.js';
import type { VendorChecklist } from '../schemas/plan-people.js';
import type { Plan } from '../schemas/plan.js';
import { namedFunctions } from './ask-commands.js';
import { formatShortDate } from './describe-brief.js';
import { readNumberMentions } from './number-roles.js';
import { buildPhraseIndex, findPhrases, type Token } from './tokens.js';
import { VENDOR_WORDS } from './vocab/vendors.js';
import { expandGroups } from './vocab/word-list.js';

/** A question as the composers read it: folded text for patterns, tokens for phrases. */
export interface AskQuestion {
  readonly folded: string;
  readonly tokens: readonly Token[];
}

export interface ComposedAnswer {
  readonly answer: string;
  readonly sources: PlanSection[];
}

/** Answers list at most three items so they stay under 120 words. */
export const MAX_ITEMS = 3;
/** Sorts vendors with no book-by date after every dated one. */
const UNDATED_LAST = '9999-12-31';

const VENDOR_NAMES = buildPhraseIndex(expandGroups(VENDOR_WORDS));
const COST_WORDS =
  /\b(?:cost|costs|price|how much|kitna|kitne ka|budget|charges?|rates?|paise|paisa|payments?|advance)\b|खर्च|कितना/u;
const ASKING_WORDS = /\b(?:questions?|ask|puchh\w*|poochh\w*|check)\b|पूछ/u;
const SAVING_WORDS =
  /\b(?:save|saving|savings|cut|cheaper|reduce|bachat|bachana|over budget|afford)\b|बचत|बचा/u;

/**
 * True when the question names a vendor type ("photographer", "halwai", "पंडित").
 * @example
 * namesVendor(tokenise('book the halwai').tokens); // true
 */
export function namesVendor(tokens: readonly Token[]): boolean {
  return findPhrases(tokens, VENDOR_NAMES).length > 0;
}

function milestoneText(milestone: PaymentMilestone): string {
  const due = milestone.dueIso === undefined ? '' : ` (${formatShortDate(milestone.dueIso)})`;
  return `${milestone.label} ${formatInr(milestone.amountInr)}${due}`;
}

function bookBy(vendor: VendorChecklist): string {
  return vendor.bookByIso === undefined
    ? `about ${vendor.leadMonths} months before the date`
    : `by ${formatShortDate(vendor.bookByIso)}`;
}

function vendorCard(vendor: VendorChecklist, question: AskQuestion): ComposedAnswer {
  const name = vendor.label;
  const budget =
    vendor.budgetInr === undefined
      ? `${name} has no separate amount; it shares the ${CATEGORY_PROFILES[vendor.budgetCategory].label.toLowerCase()} line.`
      : `Plan about ${formatInr(vendor.budgetInr)} for it.`;
  if (COST_WORDS.test(question.folded)) {
    const payments = vendor.payments.map(milestoneText).join('; ');
    return {
      answer: `${name}: ${budget}${payments === '' ? '' : ` Payments: ${payments}.`} Book ${bookBy(vendor)}.`,
      sources: ['vendors', 'payments'],
    };
  }
  if (ASKING_WORDS.test(question.folded) && vendor.questions.length > 0) {
    return {
      answer: `${name}, questions to ask: ${vendor.questions.slice(0, MAX_ITEMS).join(' ')} Get the answers in writing.`,
      sources: ['vendors'],
    };
  }
  return {
    answer: `${name}: book ${bookBy(vendor)}. ${budget} The vendor card lists the questions to ask.`,
    sources: ['vendors'],
  };
}

/**
 * Vendors: the named vendor's own card, or the three to book soonest.
 * @example
 * vendorsAnswer(plan, question('When should I book the photographer?')).answer; // 'Photographer: book by …'
 */
export function vendorsAnswer(plan: Plan, question: AskQuestion): ComposedAnswer {
  const named = findPhrases(question.tokens, VENDOR_NAMES).map(({ value }) => value);
  const vendor = plan.vendors.find((candidate) => named.includes(candidate.vendorType));
  if (vendor !== undefined) return vendorCard(vendor, question);
  const [missing] = named;
  const soonest = [...plan.vendors]
    .sort((a, b) => (a.bookByIso ?? UNDATED_LAST).localeCompare(b.bookByIso ?? UNDATED_LAST))
    .slice(0, MAX_ITEMS)
    .map((item) => `${item.label} ${bookBy(item)}`)
    .join('; ');
  const lead =
    missing === undefined ? '' : `${VENDOR_PROFILES[missing].label} is not part of this plan. `;
  return {
    answer: `${lead}Book first: ${soonest}. Each vendor card lists the questions to ask.`,
    sources: ['vendors'],
  };
}

/**
 * Late or loud music: the night-sound rule (PERM-02) as it applies to this plan.
 * @example
 * soundAnswer(plan).sources; // ['permissions', 'risks']
 */
export function soundAnswer(plan: Plan): ComposedAnswer {
  const night = plan.permissions.find((permission) => permission.id === 'night-sound');
  const blocker = plan.risks.find((risk) => risk.ruleId === 'PERM-02');
  const speaker = plan.permissions.find(
    (permission) => permission.id === 'loudspeaker' && permission.required,
  );
  const also =
    speaker === undefined ? '' : ` You also need ${speaker.title} from ${speaker.authority}.`;
  if (blocker !== undefined)
    return {
      answer: `${blocker.title}. ${night?.note ?? ''} ${blocker.fix}${also}`,
      sources: ['permissions', 'risks'],
    };
  if (night !== undefined)
    return { answer: `${night.title}. ${night.note}${also}`, sources: ['permissions', 'risks'] };
  return {
    answer:
      "This plan has no amplified sound outdoors, so the night-time limit does not apply. Indoors, follow the venue's own sound rules and stop time.",
    sources: ['permissions'],
  };
}

/**
 * "Is the venue big enough?": the space check for the asked (or expected) guest count.
 * @example
 * spaceAnswer(plan, question('Is the venue big enough for 300 people?')).sources; // ['space']
 */
export function spaceAnswer(plan: Plan, question: AskQuestion): ComposedAnswer {
  const asked = readNumberMentions(question.tokens).find((mention) => mention.role === 'guests');
  const guests = asked?.phrase.high ?? plan.headcount.expected;
  const { capacity, layout, sqftPerGuest } = plan.space;
  const seating = SPACE_LAYOUT_PROFILES[layout].label.toLowerCase();
  if (capacity !== undefined) {
    const answer =
      guests <= capacity
        ? `Yes: the venue fits about ${capacity} guests (${seating}), so ${guests} fit.`
        : `No: the venue fits about ${capacity} guests (${seating}), fewer than ${guests}. Choose a bigger hall, a standing layout or split the guests across functions.`;
    return { answer, sources: ['space'] };
  }
  const needed = Math.ceil((guests * sqftPerGuest) / USABLE_FLOOR_SHARE);
  return {
    answer: `Ask the venue for its floor area. ${guests} guests (${seating}) need about ${needed.toLocaleString('en-IN')} sq ft: ${sqftPerGuest} sq ft a guest plus room for the stage and aisles. Add the area to your brief and the space check confirms it.`,
    sources: ['space'],
  };
}

/**
 * Rain: the plan's rain risk (CTX-07), or why rain is unlikely, plus the tent card.
 * @example
 * weatherAnswer(plan).sources; // ['risks', 'vendors']
 */
export function weatherAnswer(plan: Plan): ComposedAnswer {
  const echo = plan.contextEcho;
  const rain = plan.risks.find((risk) => risk.ruleId === 'CTX-07');
  const tent = plan.vendors.find((vendor) => vendor.vendorType === 'tent_house');
  const covered = echo.setting === 'outdoor' || echo.setting === 'mixed';
  const outlook =
    rain !== undefined
      ? `${rain.title}. ${rain.fix}`
      : echo.dateIso === undefined
        ? 'Your date is not fixed yet, so rain cannot be judged; an outdoor event in the monsoon needs a covered fallback.'
        : `Rain is not a usual risk in ${echo.cityName} on your date${covered ? ', but keep a covered fallback for the open-air part' : ''}.`;
  const [tentQuestion] = tent?.questions ?? [];
  const tentLine =
    tent === undefined
      ? ''
      : ` ${tent.label}: book ${bookBy(tent)}${tentQuestion === undefined ? '' : ` and ask: ${tentQuestion}`}`;
  return { answer: `${outlook}${tentLine}`, sources: ['risks', 'vendors'] };
}

function generalBudget(plan: Plan): string {
  const top = [...plan.budget.lines]
    .sort((a, b) => b.amountInr - a.amountInr)
    .slice(0, MAX_ITEMS)
    .map((line) => `${line.label} ${formatLakh(line.amountInr)}`)
    .join(', ');
  return `Your budget is ${formatLakh(plan.budget.totalInr)} (${formatInr(plan.budget.perGuestInr)} per guest). Biggest lines: ${top}. ${plan.verdict.money.reason}`;
}

/**
 * Money: the lever for a named function (LEV-04), the biggest savings, or the budget.
 * @example
 * budgetAnswer(plan, question('Should we cut the reception to save money?')).sources; // ['levers', 'budget']
 */
export function budgetAnswer(plan: Plan, question: AskQuestion): ComposedAnswer {
  const named = namedFunctions(question.tokens);
  const drop = plan.levers.find((lever) =>
    (lever.patch?.ops ?? []).some((op) => op.op === 'removeFunction' && named.includes(op.value)),
  );
  if (drop !== undefined)
    return {
      answer: `${drop.title}: ${drop.detail} The money verdict would then read "${MONEY_LABELS[drop.newMoneyStatus]}". Press Apply on that lever to see the new plan first.`,
      sources: ['levers', 'budget'],
    };
  const slice = plan.functions.find((fn) => named.includes(fn.functionKind));
  if (slice !== undefined)
    return {
      answer: `The ${slice.label} has ${formatInr(slice.budgetInr)} of your budget for ${slice.guests} guests. ${plan.verdict.money.reason}`,
      sources: ['functions', 'budget'],
    };
  if (SAVING_WORDS.test(question.folded) && plan.levers.length > 0)
    return {
      answer: `Biggest savings: ${plan.levers
        .slice(0, MAX_ITEMS)
        .map((lever) => `${lever.title} (about ${formatInr(lever.savingInr)})`)
        .join('; ')}. Each lever shows what changes before you apply it.`,
      sources: ['levers', 'budget'],
    };
  return { answer: generalBudget(plan), sources: ['budget', 'verdict'] };
}
