/**
 * The labelled brief battery's case shape (research note 09 §5.4): one brief, the fields the
 * reader must fill, the core fields it must leave for the form, and the fields it must never set.
 *
 * Responsibility: the type shared by the four battery files and the helpers that turn a case's
 * language group into the expected language. Boundary: test support only; the expected values
 * are the battery's labels (the research note is the oracle), not numbers the reader computes.
 */
import type { LanguageCode } from '../../domain/languages.js';
import type { BriefDraft } from '../../schemas/brief.js';
import type { CORE_BRIEF_FIELDS } from '../../offline/read-brief.js';
import type { FestivalKey } from '../../offline/vocab/festivals.js';

/** Every battery row is read on this day (a Tuesday), as in the research note. */
export const BATTERY_TODAY = '2026-10-20';

export type BriefLang = 'EN' | 'HI' | 'HG' | 'MX';

export type CoreBriefField = (typeof CORE_BRIEF_FIELDS)[number];

export interface BriefCase {
  readonly id: string;
  readonly lang: BriefLang;
  readonly text: string;
  /** Fields the validated draft must hold, exactly. */
  readonly expect: Partial<BriefDraft>;
  /** A festival named without "before/after": its month comes from the year-keyed table. */
  readonly festival?: FestivalKey;
  /** The core fields the form still has to ask for. */
  readonly missing: readonly CoreBriefField[];
  /** Fields the reader must not set (the guardrail checks). */
  readonly absent: readonly (keyof BriefDraft)[];
  /** Why this case exists. */
  readonly tests: string;
}

/** Devanagari or mixed briefs answer in Hindi; English and Hinglish briefs in English (09 §5.2.7). */
export const LANGUAGE_OF: Readonly<Record<BriefLang, LanguageCode>> = {
  EN: 'en',
  HG: 'en',
  HI: 'hi',
  MX: 'hi',
};
