/**
 * Prompt for GenAI job 4, message drafts (GENAI_ARCHITECTURE.md): vendor enquiry, invitation, RSVP
 * reminder, volunteer brief, thank-you and plan summary, in the user's language and tone.
 *
 * Responsibility: hand the model only the draft facts (no budget in a vendor enquiry, no
 * guest names), the kind's purpose and the limits — numbers and dates only from the facts,
 * a body under 900 characters so WhatsApp and Gmail links stay short, factsUsed listing the
 * fact keys used — with the host's typed name fenced as data; an English draft for a family
 * that typed Hinglish is asked for in Hinglish. Boundary: builds strings; the draft check and
 * the offline templates live elsewhere.
 */
import type { LanguageCode } from '../domain/languages.js';
import { draftRegister } from '../offline/drafts.js';
import { MAX_DRAFT_BODY_CHARS } from '../schemas/limits.js';
import { DRAFT_FACT_KEYS, draftModelOutputSchema } from '../schemas/model-outputs.js';
import { draftFactLines, type DraftFacts, type DraftKind, type DraftTone } from './draft-facts.js';
import { wrapUntrusted } from './prompt-boundary.js';
import { closedList, systemInstruction, type PromptPair } from './prompt-rules.js';

export interface DraftPromptInput {
  readonly kind: DraftKind;
  readonly language: LanguageCode;
  readonly tone: DraftTone;
  readonly facts: DraftFacts;
  readonly nonce: string;
  /** "hinglish" when the brief was Hindi in the Latin script; honoured only for English. */
  readonly register?: 'hinglish';
}

/** What each message is for, in one line the model can follow. */
const PURPOSE: Readonly<Record<DraftKind, string>> = {
  'vendor-enquiry':
    'An enquiry to a vendor: introduce the event, ask whether they are free on the date, and ask the listed questions. Do not mention the budget.',
  invitation:
    'An invitation to guests: the occasion, the date, the city and a warm request to attend.',
  'rsvp-reminder': 'A short RSVP reminder asking guests to confirm whether they will come.',
  'volunteer-brief':
    'A brief for volunteers: the occasion, the date, the scale and a request to sign up for a role.',
  'thank-you': 'A thank-you note to guests or helpers after the event.',
  'plan-summary':
    'A summary of the plan for the family: the occasion, date, city, guests, functions and budget.',
};

const TONE_RULE: Readonly<Record<DraftTone, string>> = {
  warm: 'Tone: warm and personal, as a family member would write.',
  formal: 'Tone: polite and formal.',
};

/** Email-style drafts carry a subject line; WhatsApp-style ones do not. */
const NEEDS_SUBJECT: ReadonlySet<DraftKind> = new Set(['vendor-enquiry', 'plan-summary']);

/**
 * Builds the drafting prompt (job 4).
 * @example
 * buildDraftPrompt({ kind: 'invitation', language: 'hi', tone: 'warm', facts, nonce: 'a1b2c3d4' })
 *   .systemInstruction.includes('Hindi'); // true
 * buildDraftPrompt({ kind: 'invitation', language: 'en', register: 'hinglish', tone: 'warm', facts, nonce: 'a1b2c3d4' })
 *   .systemInstruction.includes('Hinglish'); // true
 */
export function buildDraftPrompt(input: DraftPromptInput): PromptPair {
  const rules = [
    `Task: ${PURPOSE[input.kind]}`,
    TONE_RULE[input.tone],
    `Keep the body under ${MAX_DRAFT_BODY_CHARS} characters. ${NEEDS_SUBJECT.has(input.kind) ? 'Add a short subject line.' : 'Leave the subject out.'}`,
    "Use only the facts given. Every number and date in the message must come from the facts; never add prices, phone numbers, addresses, links or anyone else's name.",
    'List in factsUsed the keys of the facts you used.',
    closedList('Fact keys', DRAFT_FACT_KEYS),
  ];
  const host =
    input.facts.hostName === undefined
      ? []
      : [
          'hostName (sign the message with it):',
          wrapUntrusted('HOST_NAME', input.facts.hostName, input.nonce),
        ];
  return {
    systemInstruction: systemInstruction(
      rules,
      draftModelOutputSchema,
      input.language,
      // The same register rule the offline templates follow, so both twins agree.
      draftRegister(input.language, input.register) === 'hinglish',
    ),
    prompt: [
      'Facts:',
      wrapUntrusted('FACTS', draftFactLines(input.facts), input.nonce),
      ...host,
      `Write the ${input.kind} now.`,
    ].join('\n'),
  };
}
