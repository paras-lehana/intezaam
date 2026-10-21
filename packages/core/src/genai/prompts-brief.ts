/**
 * Prompt for GenAI job 1, the brief reader (synthesis §5): an English, Hindi or Hinglish
 * brief becomes a structured draft the user confirms.
 *
 * Responsibility: give the model today's date, every closed vocabulary the reply may use,
 * and the reading rules — copy guest and budget phrases as written (code parses them),
 * quote evidence verbatim for every field, never infer a tradition from a name or a city,
 * keep a community's households and days apart from guests, list what is missing — with the
 * brief fenced as untrusted data. Boundary: builds strings;
 * the evidence guard (brief-guard.ts) decides what survives.
 */
import { BRIEF_VOCABULARIES, briefModelOutputSchema } from '../schemas/brief.js';
import { wrapUntrusted } from './prompt-boundary.js';
import { closedList, systemInstruction, type PromptPair } from './prompt-rules.js';

export interface BriefPromptInput {
  /** The brief after PII redaction and Unicode sanitising. */
  readonly text: string;
  readonly todayIso: string;
  readonly nonce: string;
}

const BRIEF_RULES: readonly string[] = [
  'Task: read the celebration brief and fill only the fields it states.',
  'For every field you fill, add an evidence item whose quote is copied exactly from the brief (a few words). A field without a verbatim quote will be discarded.',
  'Copy the guest phrase into guestsText and the budget phrase into budgetText exactly as written ("2 lakh", "dhai sau mehmaan", "₹25 L"). Do not convert them to numbers; the app parses them.',
  'Hinglish is normal: lakh/lac/L = 100000, crore/cr = 10000000, k/hazaar = 1000, sau = 100; dedh = 1.5, dhai = 2.5, sava adds a quarter, paune takes away a quarter, saade adds a half.',
  'A per-plate price is not the budget. Flat numbers, house numbers and phone numbers are not guests.',
  // Community briefs count households and days; reading "150 flats" as 150 guests breaks the funding maths.
  'For a community event, copy the households phrase ("150 flats", "200 ghar") into householdsText and the length ("10 days", "5 din") into daysText exactly as written. Flats and households are not guests, and days are not a date. Set premises "private" for a housing society, compound or RWA, and "public" for a road or public ground.',
  'Never infer a tradition or religion from a person\'s name, a surname or the city. Fill tradition only when the brief states it (for example "Punjabi shaadi", "nikah", "church wedding").',
  '"No onion garlic" is vegetarian, not Jain. Fill diet "jain" only when the brief says Jain.',
  'Resolve dates against today. If only a month or a festival is given, fill month and set dateFlexible to true; never guess a day.',
  'List in "missing" each of family, date, city, guests and budget that the brief does not state.',
  'Write "understood" as one short line in English summarising what you read.',
  ...Object.entries(BRIEF_VOCABULARIES).map(([label, values]) => closedList(label, values)),
];

/**
 * Builds the brief-reading prompt (job 1).
 * @example
 * buildBriefPrompt({ text: '2 lakh mein 200 log', todayIso: '2026-10-20', nonce: 'a1b2c3d4' })
 *   .prompt.includes('<<<BRIEF_a1b2c3d4>>>'); // true
 */
export function buildBriefPrompt(input: BriefPromptInput): PromptPair {
  return {
    systemInstruction: systemInstruction(BRIEF_RULES, briefModelOutputSchema, 'en'),
    prompt: [
      `Today is ${input.todayIso}.`,
      'Read this brief:',
      wrapUntrusted('BRIEF', input.text, input.nonce),
    ].join('\n'),
  };
}
