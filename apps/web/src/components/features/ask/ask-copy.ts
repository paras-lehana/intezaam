/**
 * Words for Ask Intezaam: plan sections an answer cites, the tab each lives on, refusals
 * and example questions.
 *
 * Responsibility: closed tables keyed by core's unions (PlanSection, refusal reasons), so a
 * new section or reason cannot ship without its words, plus starter questions in English,
 * Hinglish and Hindi. Boundary: display text only.
 */
import type { PlanSection } from '@intezaam/core/domain';
import type { REFUSAL_REASONS } from '@intezaam/core/schemas';
import type { WorkspaceTab } from '../panel-props';

export type RefusalReason = (typeof REFUSAL_REASONS)[number];

export const SECTION_LABELS: Readonly<Record<PlanSection, string>> = {
  verdict: 'Verdict',
  budget: 'Budget',
  levers: 'Ways to save',
  payments: 'Payments',
  timeline: 'Timeline',
  functions: 'Functions',
  vendors: 'Vendors',
  headcount: 'Headcount',
  food: 'Food',
  space: 'Venue space',
  permissions: 'Permissions',
  crowd: 'Crowd safety',
  risks: 'Risks',
  accessibility: 'Accessibility',
  community: 'Community money',
  ideas: 'Ideas',
};

/** Where each cited section is shown, so a citation can open that tab. */
export const SECTION_TABS: Readonly<Record<PlanSection, WorkspaceTab>> = {
  verdict: 'overview',
  budget: 'money',
  levers: 'money',
  payments: 'money',
  timeline: 'timeline',
  functions: 'timeline',
  vendors: 'vendors',
  headcount: 'people',
  food: 'people',
  space: 'people',
  permissions: 'safety',
  crowd: 'safety',
  risks: 'safety',
  accessibility: 'safety',
  community: 'people',
  ideas: 'ideas',
};

export const REFUSAL_COPY: Readonly<Record<RefusalReason, string>> = {
  'booking-or-payment':
    'Intezaam cannot book vendors or make payments for you. It helps you plan and compare — please contact the vendor yourself.',
  'legal-advice':
    'This needs an official answer. For permits and rules, ask your local police station or municipal office.',
  'off-scope':
    'That is outside your plan. Ask about your budget, dates, vendors, guests, food or safety.',
};

/**
 * Starter questions: core's rules answer every one of these without a model call (synthesis
 * §5, job 5) — two questions, a Hinglish change request and a Hindi question.
 */
export const ASK_EXAMPLES: readonly string[] = [
  'What should I do first?',
  'Kitne plates order karein?',
  '50 log kam karo',
  'बजट में सबसे बड़ा खर्च क्या है?',
];
