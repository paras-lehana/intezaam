/**
 * Offline twin of GenAI job 4 (drafts): the same `DraftModelOutput` the model returns,
 * filled from templates and the draft facts with no network.
 *
 * Responsibility: pick the register — Devanagari Hindi for Hindi, Hinglish when the user
 * writes Hindi in the Latin script, English otherwise (other languages need the model) —
 * fill the kind's template, cap the subject and body to the schema limits, list which
 * draft facts the text used, and strip fact values for the draft check's script test.
 * Boundary: pure; links are built by the integrations module.
 */
import type { LanguageCode } from '../domain/languages.js';
import { clipText } from '../format.js';
import type { DraftFacts, DraftKind, DraftTone } from '../genai/draft-facts.js';
import { MAX_DRAFT_BODY_CHARS, MAX_SUBJECT_CHARS } from '../schemas/limits.js';
import { DRAFT_FACT_KEYS, type DraftModelOutput } from '../schemas/model-outputs.js';
import {
  EN_TEMPLATES,
  HI_TEMPLATES,
  type DraftRegister,
  type Template,
} from './draft-templates.js';
import { HINGLISH_TEMPLATES } from './draft-templates-hinglish.js';

export interface DraftOfflineInput {
  readonly kind: DraftKind;
  readonly language: LanguageCode;
  readonly tone: DraftTone;
  /** "hinglish" when the brief was Hindi typed in the Latin script (research note 09 §5.2.7). */
  readonly register?: 'hinglish';
}

const TEMPLATES: Readonly<Record<DraftRegister, Readonly<Record<DraftKind, Template>>>> = {
  en: EN_TEMPLATES,
  hi: HI_TEMPLATES,
  hinglish: HINGLISH_TEMPLATES,
};

type FactKey = (typeof DRAFT_FACT_KEYS)[number];

/** The text each fact contributes, to tell which facts a message used. */
function factValues(facts: DraftFacts): Readonly<Record<FactKey, readonly string[]>> {
  return {
    eventKind: [facts.eventKind, facts.eventKind.toLowerCase()],
    date: facts.date === undefined ? [] : [facts.date],
    city: [facts.city],
    guestBand: [facts.guestBand],
    budgetBand: facts.budgetBand === undefined ? [] : [facts.budgetBand],
    functions: facts.functions,
    vendorCategory: facts.vendorCategory === undefined ? [] : [facts.vendorCategory],
    questions: facts.questions ?? [],
    hostName: facts.hostName === undefined ? [] : [facts.hostName],
  };
}

/**
 * The fact keys whose values appear in a message.
 * @example
 * factsUsedIn('Wedding in Jaipur', facts); // ['eventKind', 'city']
 */
export function factsUsedIn(text: string, facts: DraftFacts): FactKey[] {
  const values = factValues(facts);
  return DRAFT_FACT_KEYS.filter((key) =>
    values[key].some((value) => value !== '' && text.includes(value)),
  );
}

/**
 * The text with every fact value removed. Facts come as display strings in English (city,
 * functions, vendor questions), so a message may copy them as they are without counting
 * against the script check.
 * @example
 * withoutFactValues('जयपुर में Wedding', facts); // 'जयपुर में  '
 */
export function withoutFactValues(text: string, facts: DraftFacts): string {
  const values = DRAFT_FACT_KEYS.flatMap((key) => factValues(facts)[key]).filter(
    (value) => value !== '',
  );
  // Longest first, so a question is removed whole before a shorter value inside it.
  return [...values]
    .sort((a, b) => b.length - a.length)
    .reduce((rest, value) => rest.split(value).join(' '), text);
}

/**
 * The template register for a language: Hindi → Devanagari, English + Hinglish hint →
 * Hinglish, everything else → English.
 * @example
 * draftRegister('en', 'hinglish'); // 'hinglish'
 */
export function draftRegister(language: LanguageCode, register?: 'hinglish'): DraftRegister {
  if (language === 'hi') return 'hi';
  return language === 'en' && register === 'hinglish' ? 'hinglish' : 'en';
}

/**
 * Writes a draft with no model.
 * @example
 * draftOffline({ kind: 'rsvp-reminder', language: 'en', tone: 'warm', register: 'hinglish' }, facts).body;
 * // 'Namaste ji 🙏\n\nAap Jaipur mein hamare Wedding (25 Nov 2026) mein padhaar rahe hain? …'
 */
export function draftOffline(input: DraftOfflineInput, facts: DraftFacts): DraftModelOutput {
  const register = draftRegister(input.language, input.register);
  const text = TEMPLATES[register][input.kind](facts, input.tone);
  const body = clipText(text.body, MAX_DRAFT_BODY_CHARS);
  const subject =
    text.subject === undefined ? undefined : clipText(text.subject, MAX_SUBJECT_CHARS);
  return {
    ...(subject === undefined ? {} : { subject }),
    body,
    language: register === 'hi' ? 'hi' : 'en',
    factsUsed: factsUsedIn(`${subject ?? ''}\n${body}`, facts),
  };
}
