/**
 * Draft facts for GenAI job 4: the only facts a vendor enquiry, invitation, RSVP reminder,
 * volunteer brief, thank-you or plan summary may use (GENAI_ARCHITECTURE.md, job 4).
 *
 * Responsibility: pick from the computed plan the event kind, date, city, guest count,
 * functions, the vendor's checklist questions and — for the family's own plan summary only —
 * the budget, as display strings. A vendor enquiry never carries the budget (it would
 * anchor the vendor's price). The host's name is the user's own text and is fenced later.
 * Boundary: pure; the prompt, the offline templates and the faithfulness check share it.
 */
import { EVENT_KIND_PROFILES } from '../domain/event-kinds.js';
import { VENDOR_PROFILES, type VendorType } from '../domain/vendors.js';
import { formatLakh } from '../format.js';
import { formatShortDate } from '../offline/describe-brief.js';
import type { DRAFT_KINDS, DRAFT_TONES } from '../schemas/model-outputs.js';
import type { Plan } from '../schemas/plan.js';

export type DraftKind = (typeof DRAFT_KINDS)[number];

export type DraftTone = (typeof DRAFT_TONES)[number];

export interface DraftFacts {
  readonly eventKind: string;
  /** "25 Nov 2026", or undefined while the date is not fixed. */
  readonly date?: string;
  readonly city: string;
  readonly guestBand: string;
  readonly budgetBand?: string;
  readonly functions: readonly string[];
  readonly vendorCategory?: string;
  readonly questions?: readonly string[];
  readonly hostName?: string;
}

export interface DraftFactsRequest {
  readonly kind: DraftKind;
  readonly vendorType?: VendorType;
  readonly hostName?: string;
}

/** A vendor enquiry asks the three most important playbook questions. */
const MAX_ENQUIRY_QUESTIONS = 3;

/**
 * The facts a draft may use, taken from the plan.
 * @example
 * buildDraftFacts(plan, { kind: 'vendor-enquiry', vendorType: 'caterer' }).budgetBand; // undefined
 */
export function buildDraftFacts(plan: Plan, request: DraftFactsRequest): DraftFacts {
  const echo = plan.contextEcho;
  const vendor =
    request.vendorType === undefined
      ? undefined
      : plan.vendors.find((checklist) => checklist.vendorType === request.vendorType);
  const questions = vendor?.questions.slice(0, MAX_ENQUIRY_QUESTIONS);
  return {
    eventKind: EVENT_KIND_PROFILES[echo.kind].label,
    ...(echo.dateIso === undefined ? {} : { date: formatShortDate(echo.dateIso) }),
    city: echo.cityName,
    guestBand: `${plan.headcount.invited} guests`,
    ...(request.kind === 'plan-summary' ? { budgetBand: formatLakh(plan.budget.totalInr) } : {}),
    functions: plan.functions.map((card) => card.label),
    ...(request.vendorType === undefined
      ? {}
      : { vendorCategory: VENDOR_PROFILES[request.vendorType].label }),
    ...(questions === undefined || request.kind !== 'vendor-enquiry' ? {} : { questions }),
    ...(request.hostName === undefined ? {} : { hostName: request.hostName }),
  };
}

/**
 * The facts as "key: value" lines (the host's name is left out: it is fenced separately).
 * @example
 * draftFactLines(facts).includes('city: Jaipur'); // true
 */
export function draftFactLines(facts: DraftFacts): string {
  return [
    `eventKind: ${facts.eventKind}`,
    `date: ${facts.date ?? 'not fixed yet'}`,
    `city: ${facts.city}`,
    `guestBand: ${facts.guestBand}`,
    ...(facts.budgetBand === undefined ? [] : [`budgetBand: ${facts.budgetBand}`]),
    `functions: ${facts.functions.join(', ') || 'none'}`,
    ...(facts.vendorCategory === undefined ? [] : [`vendorCategory: ${facts.vendorCategory}`]),
    ...(facts.questions === undefined ? [] : [`questions: ${facts.questions.join(' | ')}`]),
  ].join('\n');
}
