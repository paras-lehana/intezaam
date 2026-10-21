/**
 * Functions — the Indian unit of planning (a haldi, a sangeet, a bhog, a party).
 *
 * Responsibility: the closed list of function kinds and the profile every function
 * carries: default start time and day offset from the main day (FN-01), cost weight and
 * guest share for per-function budgets (FN-02), the vendors it needs (VEN-01), its meal
 * type (CST-04) and seating layout (SPACE-01). Boundary: defaults only; traditions rename
 * or move functions in traditions.ts; the data rows live in function-profiles-*.ts.
 */
import type { MealType } from './catering.js';
import type { EventFamily } from './events.js';
import { OTHER_FUNCTION_PROFILES } from './function-profiles-other.js';
import { WEDDING_FUNCTION_PROFILES } from './function-profiles-wedding.js';
import type { SourceId } from './sources.js';
import type { SpaceLayout } from './space.js';
import type { VendorType } from './vendors.js';

export const WEDDING_FUNCTION_KINDS = [
  'roka',
  'engagement',
  'haldi',
  'mehendi',
  'sangeet',
  'wedding',
  'reception',
] as const;

/** Parties, pujas, ceremonies, meals and the community programme. */
export const OTHER_FUNCTION_KINDS = [
  'party',
  'puja',
  'ceremony',
  'meal',
  'cultural-night',
  'bhog',
  'visarjan',
  'mela',
  'satsang',
  'fundraiser',
] as const;

export const FUNCTION_KINDS = [...WEDDING_FUNCTION_KINDS, ...OTHER_FUNCTION_KINDS] as const;

export type WeddingFunctionKind = (typeof WEDDING_FUNCTION_KINDS)[number];
export type OtherFunctionKind = (typeof OTHER_FUNCTION_KINDS)[number];
export type FunctionKind = (typeof FUNCTION_KINDS)[number];

export interface FunctionProfile {
  readonly label: string;
  readonly labelHi: string;
  /** Families that may include this function; the context schema rejects any other pairing. */
  readonly families: readonly EventFamily[];
  /** HH:MM, 24-hour (owner's planner defaults, 01 §3.2; grade D where marked). */
  readonly defaultStartHhmm: string;
  /** Planning length used by the run sheet and the noise-curfew check (grade D). */
  readonly durationHours: number;
  /** Days from the main day (0); negative = before (04 §4, indicative). */
  readonly dayOffset: number;
  /** Visarjan closes a multi-day programme, so it sits on the last day, not day 0. */
  readonly onLastDay: boolean;
  /** Relative share of fixed costs (FN-02; no source publishes one, grade D). */
  readonly weight: number;
  /** Default share of invited guests who attend this function (grade D, editable). */
  readonly guestShare: number;
  readonly vendors: readonly VendorType[];
  readonly meal: MealType;
  readonly layout: SpaceLayout;
  readonly sourceIds: readonly SourceId[];
}

export const FUNCTION_PROFILES: Readonly<Record<FunctionKind, FunctionProfile>> = {
  ...WEDDING_FUNCTION_PROFILES,
  ...OTHER_FUNCTION_PROFILES,
};

/**
 * True when a function may be planned for an event family.
 * @example
 * functionAllowedFor('sangeet', 'birthday'); // false
 */
export function functionAllowedFor(kind: FunctionKind, family: EventFamily): boolean {
  return FUNCTION_PROFILES[kind].families.includes(family);
}
