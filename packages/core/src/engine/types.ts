/**
 * Engine types — the normalised context every rule family reads.
 *
 * Responsibility: the shapes passed between engine modules: the classified context (CTX-01…08
 * applied to the user's input), the normalised context (plus the budget, user or estimated)
 * and the share table the budget rules work on. Boundary: types only; `context.ts` builds
 * them and the wire contract stays in `schemas/`.
 */
import type { AccessNeed } from '../domain/accessibility.js';
import type { BudgetCategory } from '../domain/budget-categories.js';
import type { AnchorCity, CityTier } from '../domain/cities.js';
import type { CityInfo } from '../domain/city-table.js';
import type { VenueSetting } from '../domain/context-options.js';
import type { CrowdClass } from '../domain/crowd.js';
import type { EventFamily, EventKind } from '../domain/events.js';
import type { FunctionKind } from '../domain/functions.js';
import type { ScaleBand } from '../domain/scale.js';
import type { CalendarPauseId } from '../domain/seasons.js';
import type { Tradition, TraditionProfile } from '../domain/traditions.js';
import type { InrEstimate } from '../schemas/common.js';
import type { EventContext } from '../schemas/context.js';
import type { TIER_SOURCES } from '../schemas/plan.js';
import type { TimelineMode } from '../schemas/plan-time.js';

export type TierSource = (typeof TIER_SOURCES)[number];

/** Where the planned functions came from: the user, the tradition's sequence or the kind's default. */
export type FunctionsSource = 'user' | 'tradition' | 'kind';

/** CTX-04 season flags for the event date (all false and month null when undated). */
export interface SeasonInfo {
  readonly peak: boolean;
  readonly offPeak: boolean;
  readonly weekday: boolean;
  readonly month: number | null;
  readonly pauses: readonly CalendarPauseId[];
}

/** The user's input after every classifier (CTX-01…08) has run; no money yet. */
export interface ClassifiedContext {
  readonly input: EventContext;
  readonly todayIso: string;
  readonly family: EventFamily;
  readonly kind: EventKind;
  readonly tradition: Tradition | null;
  readonly traditionProfile: TraditionProfile | null;
  readonly city: CityInfo | null;
  readonly cityName: string;
  readonly tier: CityTier;
  readonly tierSource: TierSource;
  readonly anchor: AnchorCity | null;
  /** The tier caterers price at; two anchor cities cater as metros. */
  readonly cateringTier: CityTier;
  readonly scale: ScaleBand;
  readonly dateMode: TimelineMode;
  /** The event date when one is fixed (dated or past mode), else null. */
  readonly dateIso: string | null;
  readonly daysToEvent: number | null;
  readonly season: SeasonInfo;
  readonly rainRisk: boolean;
  /** CTX-08: muhurat, Chaturmas and Kharmas apply (Hindu wedding traditions only). */
  readonly hinduCalendar: boolean;
  readonly functions: readonly FunctionKind[];
  readonly functionsSource: FunctionsSource;
  readonly guests: number;
  /** Expected footfall for crowd checks: the community estimate, else the invited count. */
  readonly footfall: number;
  readonly crowdClass: CrowdClass;
  readonly setting: VenueSetting;
  readonly openAir: boolean;
  readonly plannerHired: boolean;
  readonly amplifiedSound: boolean;
  readonly accessNeeds: readonly AccessNeed[];
}

/** The classified context plus the budget the plan is built on. */
export interface NormalisedContext extends ClassifiedContext {
  readonly budgetInr: number;
  readonly budgetSource: 'user' | 'estimate';
  readonly budgetPerGuestInr: number;
  /** What a plan like this typically costs (VER-M bands or bottom-up). */
  readonly estimate: InrEstimate;
}

/** A complete share table: every category, in basis points, summing to 10,000. */
export type ShareTable = Readonly<Record<BudgetCategory, number>>;
