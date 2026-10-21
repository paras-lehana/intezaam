/**
 * Idea guard for GenAI job 2: code-enforced limits on every idea, from the model or the
 * offline library (GENAI_ARCHITECTURE.md, job 2 guardrails).
 *
 * Responsibility: drop an idea that breaks the diet (Jain: no meat, fish, egg, onion,
 * garlic, potato or other root vegetables; vegetarian: no meat, fish or egg; satvik: no
 * onion or garlic), mentions alcohol where it is not allowed, carries a rupee amount, a
 * date, a link, a phone number or a business name, or is a splurge when money is tight;
 * then attach the code-assigned cost band and a YouTube search link. Boundary: pure.
 */
import type { CostBand, EffortLevel } from '../domain/ideas.js';
import { buildYoutubeSearchUrl } from '../integrations/google-links.js';
import type { FoodFlag } from '../offline/ideas/idea-types.js';
import type { Idea, NarrationModelOutput } from '../schemas/model-outputs.js';
import { foldForMatch } from '../security/normalise.js';
import type { IdeaConstraints } from './idea-constraints.js';

type ModelIdea = NarrationModelOutput['ideas'][number];

/** Words that reveal each food flag in free text (English, Hinglish, Devanagari). */
const FOOD_TERMS: Readonly<Record<FoodFlag, RegExp>> = {
  meat: /\b(?:meat|chicken|mutton|lamb|goat|beef|pork|fish|prawns?|shrimp|crab|seafood|kebabs?|seekh|tikka masala|biryani gosht|gosht|keema|machhli|maachh)\b|मांस|चिकन|मटन|मछली/u,
  egg: /\b(?:eggs?|omelettes?|anda|ande|bhurji|mayonnaise)\b|अंडा|अंडे/u,
  'onion-garlic': /\b(?:onions?|garlic|pyaaz|pyaz|lahsun|lehsun)\b|प्याज|लहसुन/u,
  'root-veg':
    /\b(?:potato(?:es)?|aloo|carrots?|beetroot|radish|mooli|lotus stem|kand|yam|sweet potato)\b|आलू|गाजर|मूली/u,
  // "bar" alone is not alcohol: a mocktail bar or a chocolate bar is fine.
  alcohol:
    /\b(?:alcohol|beer|wine|whisk(?:e)?y|vodka|rum|gin|cocktails?|(?:open|licensed|cocktail) bar|bartenders?|daaru|daru|sharaab|sharab|liquor|champagne)\b|शराब|दारू/u,
};

/** Foods a negation can cover, and the words that join a list of them ("onion and garlic"). */
const NEGATABLE = '(?:onions?|garlic|pyaaz|pyaz|lahsun|lehsun|eggs?|alcohol|meat)';
const NEGATABLE_HI = '(?:प्याज|लहसुन|अंडे?)';
const LIST_JOIN = '(?:\\s*(?:,|/|&|and|or|aur)\\s*|\\s+)';
const LIST_JOIN_HI = '(?:\\s*(?:,|और|या)\\s*)';

/**
 * Negated mentions say what an idea avoids ("a no-onion, no-garlic bhog", "without onion
 * and garlic", "alcohol-free", "बिना प्याज और लहसुन"), so they are removed before the food
 * terms are matched; a list after one negation is removed whole.
 */
const NEGATED_FOOD = new RegExp(
  [
    `\\b(?:no|without|bina|zero)[\\s-]+${NEGATABLE}(?:${LIST_JOIN}${NEGATABLE})*\\b`,
    '\\b(?:alcohol|egg|meat|onion|garlic)[\\s-]free\\b',
    '\\bnon[\\s-]alcoholic\\b',
    `बिना ${NEGATABLE_HI}(?:${LIST_JOIN_HI}${NEGATABLE_HI})*`,
  ].join('|'),
  'gu',
);

/** Rupee amounts and dates: cost is a band attached by code, never a number in an idea. */
const MONEY_OR_DATE =
  /₹|\brs\.?\s*\d|\binr\b|\d\s*(?:lakh|lac|crore|cr|k)\b|\b\d{1,2}\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b|\b20\d{2}\b|\d+\s*%/u;
/** Links, phone numbers, emails and business suffixes are never part of an idea. */
const LINK_OR_CONTACT =
  /https?:|www\.|\.(?:com|in|org|net)\b|@|\[(?:phone|email|upi)\]|\b\d{10}\b|\+91|\b(?:pvt|ltd|llp|inc)\b/u;

/** Effort maps to a cost band when the model wrote the idea (grade D assumption). */
const BAND_BY_EFFORT: Readonly<Record<EffortLevel, CostBand>> = {
  low: 'saves',
  med: 'within',
  high: 'splurge',
};

/**
 * The food flags a context forbids: Jain forbids five, vegetarian two, satvik one, and
 * alcohol is forbidden unless allowed.
 * @example
 * forbiddenFoodFlags(constraints); // ['meat', 'egg', 'onion-garlic', 'root-veg', 'alcohol'] for Jain
 */
export function forbiddenFoodFlags(constraints: IdeaConstraints): FoodFlag[] {
  const byMenu: Readonly<Record<IdeaConstraints['menu'], readonly FoodFlag[]>> = {
    jain: ['meat', 'egg', 'onion-garlic', 'root-veg'],
    veg: ['meat', 'egg'],
    mixed: [],
    'non-veg': [],
  };
  const flags = new Set<FoodFlag>(byMenu[constraints.menu]);
  if (constraints.satvik && constraints.menu !== 'mixed' && constraints.menu !== 'non-veg') {
    flags.add('onion-garlic');
  }
  if (!constraints.alcoholAllowed) flags.add('alcohol');
  return [...flags];
}

/**
 * Why an idea's text is refused, or undefined when it passes.
 * @example
 * ideaViolation('Chicken tikka counter', ['meat']); // 'diet:meat'
 */
export function ideaViolation(text: string, forbidden: readonly FoodFlag[]): string | undefined {
  const folded = foldForMatch(text);
  const eaten = folded.replace(NEGATED_FOOD, ' ');
  const flag = forbidden.find((candidate) => FOOD_TERMS[candidate].test(eaten));
  if (flag !== undefined) return `diet:${flag}`;
  if (MONEY_OR_DATE.test(folded)) return 'money-or-date';
  return hasLinkOrContact(folded) ? 'link-or-contact' : undefined;
}

/**
 * True when text carries a link, an email, a phone number or a business suffix.
 * @example
 * hasLinkOrContact('Call 9876543210'); // true
 */
export function hasLinkOrContact(text: string): boolean {
  return LINK_OR_CONTACT.test(foldForMatch(text));
}

function ideaText(idea: ModelIdea): string {
  return [idea.title, idea.description, idea.whyItFits.text, idea.youtubeQuery].join(' ');
}

export interface IdeaGuardResult {
  readonly ideas: Idea[];
  readonly rejected: { readonly title: string; readonly reason: string }[];
}

/**
 * Filters ideas by the code-computed constraints and attaches cost band and YouTube link.
 * `bands` carries the curated band for library ideas (by title); model ideas get the
 * effort-based band.
 * @example
 * enforceIdeaConstraints(reply.ideas, constraints).ideas.every((idea) => idea.youtubeUrl.startsWith('https://')); // true
 */
export function enforceIdeaConstraints(
  ideas: readonly ModelIdea[],
  constraints: IdeaConstraints,
  bands: ReadonlyMap<string, CostBand> = new Map(),
): IdeaGuardResult {
  const forbidden = forbiddenFoodFlags(constraints);
  const kept: Idea[] = [];
  const rejected: { title: string; reason: string }[] = [];
  for (const idea of ideas) {
    const costBand = bands.get(idea.title) ?? BAND_BY_EFFORT[idea.effort];
    const reason =
      ideaViolation(ideaText(idea), forbidden) ??
      (constraints.tight && costBand === 'splurge' ? 'splurge-when-tight' : undefined);
    if (reason !== undefined) rejected.push({ title: idea.title, reason });
    else kept.push({ ...idea, costBand, youtubeUrl: buildYoutubeSearchUrl(idea.youtubeQuery) });
  }
  return { ideas: kept, rejected };
}
