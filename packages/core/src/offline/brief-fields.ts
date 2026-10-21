/**
 * Brief field readers: every field a brief can fill, read by code from tokens, each with
 * the token spans that prove it.
 *
 * Responsibility: one function that runs the number (brief-numbers.ts), date, event,
 * premises and preference readers over a tokenised text and returns typed field readings.
 * The offline brief reader turns these into a model-shaped output; the evidence guard runs
 * the same readers over a field's quotes, so "synonym in quote" is the same code as reading.
 * Boundary: pure; no evidence strings here (spans only).
 */
import type { AccessNeed } from '../domain/accessibility.js';
import type { RankableCategory } from '../domain/budget-categories.js';
import type { Premises, VenueSetting } from '../domain/context-options.js';
import type { DietProfile } from '../domain/diet.js';
import type { EventFamily, EventKind } from '../domain/events.js';
import type { FunctionKind } from '../domain/functions.js';
import type { LanguageCode } from '../domain/languages.js';
import type { StyleTag } from '../domain/style.js';
import type { Tradition } from '../domain/traditions.js';
import type { BriefField } from '../schemas/brief.js';
import { readNumberFields, spansOf } from './brief-numbers.js';
import { readNumberMentions, type NumberMention } from './number-roles.js';
import { readDate } from './parse-dates.js';
import {
  readAnandKaraj,
  readEvent,
  readFunctions,
  readPremises,
  readTradition,
} from './read-event.js';
import {
  isHinglish,
  readAccess,
  readAlcohol,
  readCity,
  readDiet,
  readPriorities,
  readSetting,
  readStyles,
} from './read-preferences.js';
import type { Token } from './tokens.js';

export interface Span {
  readonly start: number;
  readonly end: number;
}

export interface FieldReading<V> {
  readonly value: V;
  readonly spans: readonly Span[];
}

export interface DateValue {
  readonly dateIso?: string;
  readonly month?: number;
  readonly flexible: boolean;
}

export interface DietValue {
  readonly menu?: DietProfile;
  readonly halal?: boolean;
}

export type RejectReason = 'above-limit' | 'below-limit';

export interface Rejected {
  readonly field: BriefField;
  readonly reason: RejectReason;
  readonly spans: readonly Span[];
}

export interface BriefFieldReadings {
  readonly family?: FieldReading<EventFamily>;
  readonly kind?: FieldReading<EventKind>;
  readonly tradition?: FieldReading<Tradition>;
  readonly city?: FieldReading<string>;
  readonly date?: FieldReading<DateValue>;
  readonly guests?: FieldReading<number>;
  readonly budget?: FieldReading<number>;
  readonly functions?: FieldReading<FunctionKind[]>;
  readonly venueSetting?: FieldReading<VenueSetting>;
  readonly diet?: FieldReading<DietValue>;
  readonly alcohol?: FieldReading<boolean>;
  readonly accessibility?: FieldReading<AccessNeed[]>;
  readonly priorities?: FieldReading<RankableCategory[]>;
  readonly cut?: FieldReading<RankableCategory>;
  readonly styleTags?: FieldReading<StyleTag[]>;
  readonly households?: FieldReading<number>;
  readonly days?: FieldReading<number>;
  readonly premises?: FieldReading<Premises>;
  /** Punjabi or Sikh weddings only: whether the brief names an Anand Karaj (rides on tradition). */
  readonly anandKaraj?: FieldReading<boolean>;
  readonly language: LanguageCode;
  /** Hindi typed in Latin script (no Devanagari, two different Hinglish words). */
  readonly hinglish: boolean;
  /** Numbers the brief states but the limits refuse (battery B59), with their spans. */
  readonly rejected: readonly Rejected[];
}

const DEVANAGARI = /\p{Script=Devanagari}/u;

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

function list<V>(value: readonly V[], spans: readonly Span[]): FieldReading<V[]> | undefined {
  return value.length === 0 ? undefined : { value: [...value], spans };
}

function dateValue(date: DateValue): DateValue {
  if (date.dateIso !== undefined) return { flexible: date.flexible, dateIso: date.dateIso };
  return date.month === undefined
    ? { flexible: date.flexible }
    : { flexible: date.flexible, month: date.month };
}

/** Writes the number fields, or records why a stated number was rejected. */
function addNumbers(out: Mutable<BriefFieldReadings>, mentions: readonly NumberMention[]): void {
  const numbers = readNumberFields(mentions);
  Object.assign(out, numbers.values);
  out.rejected = numbers.rejected;
}

/** Writes the event fields: family, kind, and for weddings the functions and tradition. */
function addEvent(
  out: Mutable<BriefFieldReadings>,
  tokens: readonly Token[],
  age: NumberMention | undefined,
): void {
  const event = readEvent(tokens, age?.phrase.low);
  if (event.family !== undefined) out.family = { value: event.family, spans: event.spans };
  // A birthday's kind is proven by its age as well as the word ("70th birthday").
  const ageSpans = event.family === 'birthday' && age !== undefined ? spansOf([age]) : [];
  if (event.kind !== undefined)
    out.kind = { value: event.kind, spans: [...ageSpans, ...event.spans] };
  if (event.family !== 'wedding') return;
  const functions = readFunctions(tokens);
  const named = list(functions.kinds, functions.spans);
  if (named !== undefined) out.functions = named;
  const tradition = readTradition(tokens);
  if (tradition !== undefined) out.tradition = { value: tradition.value, spans: [tradition] };
  if (tradition?.value === 'punjabi-sikh') {
    const anandKaraj = readAnandKaraj(tokens);
    out.anandKaraj = { value: anandKaraj !== undefined, spans: [anandKaraj ?? tradition] };
  }
}

/** Writes the preference fields: setting, diet, alcohol, access, style, priorities, cut. */
function addPreferences(out: Mutable<BriefFieldReadings>, tokens: readonly Token[]): void {
  const setting = readSetting(tokens);
  if (setting !== undefined) out.venueSetting = setting;
  const diet = readDiet(tokens);
  if (diet.menu !== undefined)
    out.diet = {
      value: { menu: diet.menu, ...(diet.halal ? { halal: true } : {}) },
      spans: diet.spans,
    };
  else if (diet.halal) out.diet = { value: { halal: true }, spans: diet.spans };
  const alcohol = readAlcohol(tokens);
  if (alcohol !== undefined) out.alcohol = alcohol;
  const access = readAccess(tokens);
  const needs = list(access.value, access.spans);
  if (needs !== undefined) out.accessibility = needs;
  const styles = readStyles(tokens);
  const tags = list(styles.value, styles.spans);
  if (tags !== undefined) out.styleTags = tags;
  const ranked = readPriorities(tokens);
  const priorities = list(ranked.priorities, ranked.prioritySpans);
  if (priorities !== undefined) out.priorities = priorities;
  if (ranked.cut !== undefined) out.cut = { value: ranked.cut, spans: ranked.cutSpans };
}

/**
 * Reads every brief field from tokens; `todayIso` resolves relative dates.
 * @example
 * readBriefFields(tokenise('2 lakh mein 200 log, Jaipur').tokens, '2026-10-20').budget?.value; // 200000
 */
export function readBriefFields(tokens: readonly Token[], todayIso: string): BriefFieldReadings {
  const devanagari = tokens.some((token) => DEVANAGARI.test(token.text));
  const out: Mutable<BriefFieldReadings> = {
    language: devanagari ? 'hi' : 'en',
    hinglish: !devanagari && isHinglish(tokens),
    rejected: [],
  };
  const mentions = readNumberMentions(tokens);
  addNumbers(out, mentions);
  addEvent(
    out,
    tokens,
    mentions.find((mention) => mention.role === 'age'),
  );
  const city = readCity(tokens);
  if (city !== undefined) out.city = { value: city.value.name, spans: city.spans };
  const date = readDate(tokens, todayIso);
  if (date !== undefined) out.date = { value: dateValue(date), spans: [date] };
  // Read whatever the family: the guard re-reads a lone quote ("in the compound") this way.
  const premises = readPremises(tokens);
  if (premises !== undefined) out.premises = { value: premises.value, spans: [premises] };
  addPreferences(out, tokens);
  return out;
}
