/**
 * Idea constraints: the limits computed by code that every idea must respect
 * (GENAI_ARCHITECTURE.md, job 2; feature #29).
 *
 * Responsibility: derive once, from the plan and the context, what an idea may suggest —
 * family and kind, age band, season (rain risk wins), setting, diet (Jain, veg, halal,
 * satvik), whether alcohol is allowed (never for Jain or religious events), access needs,
 * style chips and whether money is tight (no splurges when the verdict is stretch or lean).
 * The narration prompt, the idea guard and the offline library all read this one object.
 * Boundary: pure derivation; no filtering here.
 */
import type { AccessNeed } from '../domain/accessibility.js';
import type { VenueSetting } from '../domain/context-options.js';
import type { DietProfile } from '../domain/diet.js';
import { EVENT_KIND_PROFILES } from '../domain/event-kinds.js';
import type { AgeBand, EventFamily, EventKind } from '../domain/events.js';
import { ACCESS_NEEDS } from '../domain/accessibility.js';
import type { StyleTag } from '../domain/style.js';
import type { Tradition } from '../domain/traditions.js';
import type { EventContext } from '../schemas/context.js';
import type { MoneyStatus } from '../schemas/plan-money.js';
import type { Plan } from '../schemas/plan.js';

export const IDEA_SEASONS = ['winter', 'summer', 'monsoon'] as const;

export type IdeaSeason = (typeof IDEA_SEASONS)[number];

export interface IdeaConstraints {
  readonly family: EventFamily;
  readonly kind: EventKind;
  readonly tradition?: Tradition;
  readonly ageBand?: AgeBand;
  readonly season?: IdeaSeason;
  readonly setting: VenueSetting;
  readonly menu: DietProfile;
  readonly jainGuests: boolean;
  readonly halal: boolean;
  readonly satvik: boolean;
  /** False for Jain menus and religious gatherings even when the user ticked alcohol. */
  readonly alcoholAllowed: boolean;
  readonly needs: readonly AccessNeed[];
  readonly styleTags: readonly StyleTag[];
  /** Stretch or lean money: splurge ideas are left out. */
  readonly tight: boolean;
}

/** Calendar months by season for idea filtering (India, grade D: Nov–Feb cool, Mar–Jun hot). */
const SEASON_MONTHS: Readonly<Record<Exclude<IdeaSeason, 'monsoon'>, readonly number[]>> = {
  winter: [11, 12, 1, 2],
  summer: [3, 4, 5, 6],
};

/** Festivals and religious occasions where alcohol is never suggested (DIET-01 alcohol-free rule). */
const ALCOHOL_FREE_KINDS: ReadonlySet<EventKind> = new Set([
  'religious-gathering',
  'festival-pandal',
  'society-festival',
  'home-puja',
  'griha-pravesh',
  'naming-mundan',
]);

const TIGHT_MONEY: ReadonlySet<MoneyStatus> = new Set(['stretch', 'lean']);

function seasonOf(month: number | null, rainRisk: boolean): IdeaSeason | undefined {
  if (rainRisk) return 'monsoon';
  if (month === null) return undefined;
  if (SEASON_MONTHS.winter.includes(month)) return 'winter';
  return SEASON_MONTHS.summer.includes(month) ? 'summer' : undefined;
}

/**
 * The constraints ideas must respect for this plan and context.
 * @example
 * ideaConstraintsFor(plan, context).alcoholAllowed; // false for a Jain menu
 */
export function ideaConstraintsFor(plan: Plan, context: EventContext): IdeaConstraints {
  const echo = plan.contextEcho;
  const ageBand = EVENT_KIND_PROFILES[echo.kind].ageBand;
  const season = seasonOf(echo.season.month, echo.rainRisk);
  const alcoholAllowed =
    context.alcohol && context.diet.menu !== 'jain' && !ALCOHOL_FREE_KINDS.has(echo.kind);
  return {
    family: echo.family,
    kind: echo.kind,
    ...(echo.tradition === undefined ? {} : { tradition: echo.tradition }),
    ...(ageBand === null ? {} : { ageBand }),
    ...(season === undefined ? {} : { season }),
    setting: echo.setting,
    menu: context.diet.menu,
    jainGuests: context.diet.jainGuests,
    halal: context.diet.halal,
    satvik: context.diet.satvik,
    alcoholAllowed,
    needs: ACCESS_NEEDS.filter((need) => context.accessibility[need] === true),
    styleTags: context.styleTags,
    tight: TIGHT_MONEY.has(plan.verdict.money.status),
  };
}
