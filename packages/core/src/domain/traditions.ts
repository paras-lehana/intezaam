/**
 * Wedding traditions (CTX-08, FN-01, DATE-04, TL-09) and their hard rules.
 *
 * Responsibility: for each tradition, its faith (which decides whether muhurat, Chaturmas
 * and Kharmas apply), officiant, default functions and their local names, ceremony time
 * overrides, hard rules (Anand Karaj only in a gurdwara; church weddings 6 am–7 pm) and
 * inputs that must be settled first (04 §4). Boundary: indicative — families vary, and a
 * tradition is only ever taken from what the user states, never inferred.
 */
import type { DietRuleKey } from './diet.js';
import type { FunctionKind } from './functions.js';
import type { SourceId } from './sources.js';
import type { Confidence } from './source-types.js';
import type { VendorType } from './vendors.js';

export const TRADITIONS = [
  'north-hindu',
  'tamil',
  'telugu',
  'bengali',
  'marathi',
  'gujarati',
  'punjabi-sikh',
  'muslim',
  'christian',
  'civil-other',
] as const;

export type Tradition = (typeof TRADITIONS)[number];

export const FAITHS = ['hindu', 'sikh', 'muslim', 'christian', 'civil'] as const;

export type Faith = (typeof FAITHS)[number];

export interface CeremonyWindow {
  readonly startHhmm: string;
  readonly endHhmm: string;
}

export interface TraditionProfile {
  readonly label: string;
  readonly labelHi: string;
  readonly faith: Faith;
  /** CTX-08: muhurat, Chaturmas and Kharmas apply to Hindu traditions only. */
  readonly muhurat: boolean;
  readonly officiant: VendorType | null;
  readonly defaultFunctions: readonly FunctionKind[];
  /** Local names shown on function cards (e.g. wedding → "Nikah"). */
  readonly functionNames: Readonly<Partial<Record<FunctionKind, string>>>;
  /** Day offsets that differ from the function defaults (e.g. Bengali Bou Bhat on day +2). */
  readonly dayOffsets: Readonly<Partial<Record<FunctionKind, number>>>;
  /** FN-01 override for the main ceremony (Telugu near midnight, Tamil in the morning). */
  readonly ceremonyStartHhmm: string | null;
  /** DATE-04: the legal ceremony window, when one exists. */
  readonly ceremonyWindow: CeremonyWindow | null;
  /** Hard rule: the main ceremony may only be held at this kind of venue. */
  readonly ceremonyVenue: 'gurdwara' | null;
  readonly dietRule: DietRuleKey | null;
  /** Things to settle before the date (TL-09). */
  readonly requiredInputs: readonly string[];
  readonly sourceIds: readonly SourceId[];
  readonly confidence: Confidence;
}

const BASE = {
  functionNames: {},
  dayOffsets: {},
  ceremonyStartHhmm: null,
  ceremonyWindow: null,
  ceremonyVenue: null,
  dietRule: null,
  requiredInputs: [],
} as const;

const HINDU = { ...BASE, faith: 'hindu', muhurat: true, officiant: 'pandit' } as const;

export const TRADITION_PROFILES: Readonly<Record<Tradition, TraditionProfile>> = {
  'north-hindu': {
    ...HINDU,
    label: 'North Indian Hindu',
    labelHi: 'उत्तर भारतीय हिंदू',
    defaultFunctions: ['haldi', 'mehendi', 'sangeet', 'wedding', 'reception'],
    sourceIds: ['S-WIKI-HINDU-WEDDING', 'S-WIKI-PUNJABI'],
    confidence: 'B',
  },
  tamil: {
    ...HINDU,
    label: 'Tamil',
    labelHi: 'तमिल',
    defaultFunctions: ['engagement', 'wedding', 'reception'],
    functionNames: { engagement: 'Nichayathartham', wedding: 'Muhurtham' },
    // Tamil muhurthams are usually in the morning (04 §4.2); 07:00 is our default.
    ceremonyStartHhmm: '07:00',
    sourceIds: ['S-VEDADHARA-ND', 'S-WEDDINGSUTRA-ND'],
    confidence: 'C',
  },
  telugu: {
    ...HINDU,
    label: 'Telugu',
    labelHi: 'तेलुगु',
    defaultFunctions: ['engagement', 'haldi', 'wedding', 'reception'],
    functionNames: { engagement: 'Nischitartham', haldi: 'Pellikuthuru', wedding: 'Muhurtham' },
    // Telugu muhurthams often fall near midnight (04 §4.2), which meets the 10 pm sound rule.
    ceremonyStartHhmm: '23:30',
    sourceIds: ['S-WIKI-TELUGU'],
    confidence: 'B',
  },
  bengali: {
    ...HINDU,
    label: 'Bengali',
    labelHi: 'बंगाली',
    defaultFunctions: ['haldi', 'wedding', 'reception'],
    functionNames: { haldi: 'Gaye Holud', reception: 'Bou Bhat' },
    dayOffsets: { haldi: 0, reception: 2 },
    sourceIds: ['S-WIKI-BENGALI'],
    confidence: 'B',
  },
  marathi: {
    ...HINDU,
    label: 'Marathi',
    labelHi: 'मराठी',
    defaultFunctions: ['engagement', 'haldi', 'wedding', 'reception'],
    functionNames: { engagement: 'Sakhar Puda', haldi: 'Halad Chadavane' },
    sourceIds: ['S-AZA-MARATHI-ND'],
    confidence: 'C',
  },
  gujarati: {
    ...HINDU,
    label: 'Gujarati',
    labelHi: 'गुजराती',
    defaultFunctions: ['engagement', 'haldi', 'mehendi', 'sangeet', 'wedding', 'reception'],
    functionNames: { engagement: 'Gol Dhana', haldi: 'Pithi', sangeet: 'Garba and dandiya night' },
    sourceIds: ['S-AZA-GUJARATI-ND'],
    confidence: 'C',
  },
  'punjabi-sikh': {
    ...BASE,
    label: 'Punjabi or Sikh',
    labelHi: 'पंजाबी या सिख',
    faith: 'sikh',
    muhurat: false,
    officiant: 'granthi',
    defaultFunctions: ['roka', 'sangeet', 'mehendi', 'haldi', 'wedding', 'reception'],
    functionNames: { sangeet: 'Sangeet and Jaggo', haldi: 'Maiyan', wedding: 'Anand Karaj' },
    ceremonyVenue: 'gurdwara',
    dietRule: 'gurdwara',
    requiredInputs: ['A gurdwara date for the Laavan', 'Marriage registration afterwards'],
    sourceIds: ['S-WIKI-ANAND-KARAJ', 'S-WIKI-PUNJABI'],
    confidence: 'B',
  },
  muslim: {
    ...BASE,
    label: 'Muslim (Nikah)',
    labelHi: 'मुस्लिम (निकाह)',
    faith: 'muslim',
    muhurat: false,
    officiant: 'qazi',
    defaultFunctions: ['mehendi', 'wedding', 'reception'],
    functionNames: { mehendi: 'Mehndi or Manjha', wedding: 'Nikah', reception: 'Walima' },
    dietRule: 'halal',
    requiredInputs: [
      'The mahr, agreed before the date',
      'Two adult witnesses (Sunni practice)',
      'A wali, where your school requires one',
    ],
    sourceIds: ['S-WIKI-NIKAH', 'S-WIKI-WALIMA'],
    confidence: 'B',
  },
  christian: {
    ...BASE,
    label: 'Christian',
    labelHi: 'ईसाई',
    faith: 'christian',
    muhurat: false,
    officiant: 'church_minister',
    defaultFunctions: ['wedding', 'reception'],
    functionNames: { wedding: 'Church wedding' },
    dayOffsets: { reception: 0 },
    // A morning service sits well inside the 6 am–7 pm window (our default, grade D).
    ceremonyStartHhmm: '11:00',
    ceremonyWindow: { startHhmm: '06:00', endHhmm: '19:00' },
    requiredInputs: ['Banns or notice in your parish (check how many weeks)', 'Two witnesses'],
    sourceIds: ['S-WIKI-ICMA', 'S-WIKI-BANNS'],
    confidence: 'B',
  },
  'civil-other': {
    ...BASE,
    label: 'Civil or other',
    labelHi: 'सिविल या अन्य',
    faith: 'civil',
    muhurat: false,
    officiant: null,
    defaultFunctions: ['wedding', 'reception'],
    requiredInputs: ['Notice and registration with your marriage registrar (not verified here)'],
    sourceIds: ['S-INTEZAAM-D'],
    confidence: 'D',
  },
};
