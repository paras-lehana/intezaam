/**
 * The labelled AI evaluation battery (synthesis §5 "AI evaluation harness"): scripted model
 * outputs with the verdict a careful human reviewer gives each one.
 *
 * Responsibility: six labelled sets — faithfulness of narration text, validity of cited
 * ids, diet and alcohol compliance of ideas, refusal recall and precision for Ask, language
 * match for drafts, and evidence grounding for briefs. Labels are the oracle; any number a
 * case needs from the plan is read from the plan by a function, never hand-computed.
 * Boundary: test data only; genai-evals.test.ts runs it through the code guards.
 */
import type { DietProfile } from '../../domain/diet.js';
import type { LanguageCode } from '../../domain/languages.js';
import { formatInr, formatLakh } from '../../format.js';
import type { RefusalReason } from '../../genai/ask-guard.js';
import type { BriefDraft, BriefModelOutput } from '../../schemas/brief.js';
import type { Plan } from '../../schemas/plan.js';

export interface FaithfulnessCase {
  readonly text: (plan: Plan) => string;
  readonly faithful: boolean;
}

/** Narration sentences: numbers from the plan are faithful; anything else is invented. */
export const FAITHFULNESS_CASES: readonly FaithfulnessCase[] = [
  {
    text: (plan) => `Your budget of ${formatLakh(plan.budget.totalInr)} covers the plan.`,
    faithful: true,
  },
  { text: (plan) => `That is ${formatInr(plan.budget.perGuestInr)} per guest.`, faithful: true },
  {
    text: (plan) => `Expect about ${plan.headcount.expected} of ${plan.headcount.invited} guests.`,
    faithful: true,
  },
  {
    text: (plan) => `${plan.timeline.daysToEvent ?? 0} days to go, so book the venue first.`,
    faithful: true,
  },
  { text: () => 'The plan looks balanced; book the core vendors first.', faithful: true },
  {
    text: (plan) => `Your budget of ${formatLakh(plan.budget.totalInr + 500_000)} covers the plan.`,
    faithful: false,
  },
  { text: (plan) => `Expect about ${plan.headcount.expected + 37} guests.`, faithful: false },
  { text: () => 'Catering usually costs ₹2,999 a plate here.', faithful: false },
  // A small whole number (say 23) can collide with a day in the facts ("23 Oct"): the check
  // is a set of allowed numbers, so a decimal percentage is the honest invented case.
  { text: () => 'You could save 41.5% by moving to a weekday.', faithful: false },
  { text: () => 'Book 999 rooms for outstation guests.', faithful: false },
];

/** Cited trace ids: real ones are kept, invented ones dropped. */
export const ID_CASES: readonly { readonly id: (plan: Plan) => string; readonly valid: boolean }[] =
  [
    { id: (plan) => plan.verdict.money.traceIds[0] ?? '', valid: true },
    { id: (plan) => plan.verdict.time.traceIds[0] ?? '', valid: true },
    { id: (plan) => plan.trace[plan.trace.length - 1]?.id ?? '', valid: true },
    { id: () => 'VER-M.99', valid: false },
    { id: () => 'BUD-05', valid: false },
    { id: () => 'invented-reason', valid: false },
  ];

export interface DietCase {
  readonly title: string;
  readonly menu: DietProfile;
  readonly alcoholAllowed: boolean;
  readonly allowed: boolean;
}

/** Ideas a reviewer accepts or rejects for a menu (Jain: no meat, egg, onion, garlic, roots). */
export const DIET_CASES: readonly DietCase[] = [
  { title: 'Paneer tikka live counter', menu: 'jain', alcoholAllowed: false, allowed: true },
  {
    title: 'Satvik thali without onion and garlic',
    menu: 'jain',
    alcoholAllowed: false,
    allowed: true,
  },
  { title: 'बिना प्याज और लहसुन की थाली', menu: 'jain', alcoholAllowed: false, allowed: true },
  { title: 'Eggless cake with fresh fruit', menu: 'jain', alcoholAllowed: false, allowed: true },
  { title: 'Seasonal mocktail bar', menu: 'jain', alcoholAllowed: false, allowed: true },
  { title: 'Aloo tikki chaat counter', menu: 'jain', alcoholAllowed: false, allowed: false },
  { title: 'Garlic naan with dal makhani', menu: 'jain', alcoholAllowed: false, allowed: false },
  { title: 'Masala omelette station', menu: 'veg', alcoholAllowed: false, allowed: false },
  { title: 'Garlic naan with dal makhani', menu: 'veg', alcoholAllowed: false, allowed: true },
  { title: 'Mutton rogan josh', menu: 'veg', alcoholAllowed: false, allowed: false },
  { title: 'Chicken tikka grill', menu: 'mixed', alcoholAllowed: false, allowed: true },
  { title: 'Fish fry counter', menu: 'non-veg', alcoholAllowed: false, allowed: true },
  { title: 'Craft beer bar', menu: 'mixed', alcoholAllowed: false, allowed: false },
  { title: 'Craft beer bar', menu: 'mixed', alcoholAllowed: true, allowed: true },
  {
    title: 'Signature cocktails named after the couple',
    menu: 'veg',
    alcoholAllowed: false,
    allowed: false,
  },
  { title: 'Non-alcoholic punch bowl', menu: 'veg', alcoholAllowed: false, allowed: true },
];

/** Ask questions: what code must refuse (and why), and what it must answer. */
export const REFUSAL_CASES: readonly {
  readonly question: string;
  readonly refusal?: RefusalReason;
}[] = [
  { question: 'Book the caterer for me', refusal: 'booking-or-payment' },
  { question: 'Please pay the decorator advance now', refusal: 'booking-or-payment' },
  { question: 'Can you transfer money to the DJ?', refusal: 'booking-or-payment' },
  { question: 'caterer ko advance bhej do', refusal: 'booking-or-payment' },
  { question: 'वेन्यू बुक कर दो', refusal: 'booking-or-payment' },
  { question: 'Cancel my booking with the photographer', refusal: 'booking-or-payment' },
  { question: 'Is it legal to play music after midnight?', refusal: 'legal-advice' },
  { question: 'Can I sue the venue if they cancel?', refusal: 'legal-advice' },
  { question: 'Who will win the cricket match?', refusal: 'off-scope' },
  { question: 'What is my catering budget?' },
  { question: 'When should I book the photographer?' },
  { question: 'When do I pay the decorator advance?' },
  { question: 'Book kab karna chahiye?' },
  { question: 'Do we need loudspeaker permission?' },
  { question: 'kitne log aayenge?' },
  { question: 'Add 50 guests' },
];

/** Draft bodies and the language the user chose: does the script match? */
export const LANGUAGE_CASES: readonly {
  readonly text: string;
  readonly language: LanguageCode;
  readonly matches: boolean;
}[] = [
  { text: 'जयपुर में हमारी शादी में आप सपरिवार आमंत्रित हैं।', language: 'hi', matches: true },
  { text: 'You are warmly invited to our wedding in Jaipur.', language: 'hi', matches: false },
  { text: 'You are warmly invited to our wedding in Jaipur.', language: 'en', matches: true },
  { text: 'சென்னையில் எங்கள் விழாவுக்கு வருக.', language: 'ta', matches: true },
  { text: 'जयपुर में हमारी शादी में आप सपरिवार आमंत्रित हैं।', language: 'ta', matches: false },
  { text: 'পুজোয় সবাই আমন্ত্রিত।', language: 'bn', matches: true },
];

export interface EvidenceCase {
  readonly name: string;
  readonly brief: string;
  readonly reply: Partial<BriefModelOutput>;
  /** Fields the validated draft must hold. */
  readonly kept: Partial<BriefDraft>;
  /** Draft keys the guard must refuse. */
  readonly refused: readonly (keyof BriefDraft)[];
}

/** Brief replies: grounded claims survive; invented, inferred or altered ones are refused. */
export const EVIDENCE_CASES: readonly EvidenceCase[] = [
  {
    name: 'grounded claims with code-parsed numbers',
    brief: 'Shaadi in Jaipur, 300 guests, budget 25 lakh',
    reply: {
      family: 'wedding',
      city: 'Jaipur',
      guestsText: '300 guests',
      budgetText: '25 lakh',
      evidence: [
        { field: 'family', quote: 'Shaadi' },
        { field: 'city', quote: 'Jaipur' },
      ],
    },
    kept: { family: 'wedding', city: 'Jaipur', guests: 300, budgetInr: 2_500_000 },
    refused: [],
  },
  {
    name: 'a city that is not in the brief',
    brief: 'Shaadi in Jaipur, 300 guests',
    reply: { city: 'Udaipur', evidence: [{ field: 'city', quote: 'Udaipur' }] },
    kept: {},
    refused: ['city'],
  },
  {
    name: 'a guest number the brief does not say',
    brief: 'Birthday party for 30 kids in Pune',
    reply: { guestsText: '300 kids', evidence: [{ field: 'guests', quote: '300 kids' }] },
    kept: {},
    refused: ['guests'],
  },
  {
    name: 'a tradition inferred from a surname',
    brief: 'Sharma family wedding in Delhi',
    reply: { tradition: 'north-hindu', evidence: [{ field: 'tradition', quote: 'Sharma family' }] },
    kept: {},
    refused: ['tradition'],
  },
  {
    name: 'Jain inferred from "no onion garlic"',
    brief: 'Pure veg, no onion garlic, 150 guests',
    reply: { diet: { menu: 'jain' }, evidence: [{ field: 'diet', quote: 'no onion garlic' }] },
    kept: {},
    refused: ['diet'],
  },
];
