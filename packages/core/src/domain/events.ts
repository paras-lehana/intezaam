/**
 * Event families and kinds — what the user is celebrating.
 *
 * Responsibility: the closed list of four families and their kinds (synthesis §3 row 1)
 * and each family's planning limits (minimum workable lead time, contingency floor,
 * typical overrun). Boundary: data only; each kind's defaults are in event-kinds.ts.
 */
import type { SourceId } from './sources.js';
import type { NumberRange } from './units.js';
import { range } from './units.js';

export const EVENT_FAMILIES = ['wedding', 'birthday', 'community', 'family-function'] as const;

export type EventFamily = (typeof EVENT_FAMILIES)[number];

/** Kinds per family: weddings vary by tradition (traditions.ts), the rest by occasion. */
export const EVENT_KINDS = [
  'wedding',
  'first-birthday',
  'kids-birthday',
  'teen-birthday',
  'milestone-birthday',
  'sixtieth-birthday',
  'festival-pandal',
  'society-festival',
  'religious-gathering',
  'rwa-function',
  'charity-fundraiser',
  'engagement',
  'anniversary',
  'griha-pravesh',
  'home-puja',
  'naming-mundan',
  'baby-shower',
  'retirement',
] as const;

export type EventKind = (typeof EVENT_KINDS)[number];

/** Age bands drive idea filters and safety checks for birthdays (04 §5.2). */
export const AGE_BANDS = ['baby', 'kid', 'teen', 'adult', 'elder'] as const;

export type AgeBand = (typeof AGE_BANDS)[number];

export interface FamilyProfile {
  readonly label: string;
  readonly labelHi: string;
  /**
   * VER-T: below this many days the time verdict is Critical. Grade D (synthesis §4.5):
   * wedding 45, family function 21, birthday 7, community with permissions 30 (Mumbai's
   * pandal window opens about a month before the festival, S-BMC-2026).
   */
  readonly minWorkableLeadDays: number;
  /** BUD-07: contingency never drops below this many basis points of the core budget. */
  readonly contingencyFloorBp: number;
  /** Typical overrun of the first estimate, in percent, where a source states one. */
  readonly overrunPct: NumberRange | null;
  readonly sourceIds: readonly SourceId[];
}

export const FAMILY_PROFILES: Readonly<Record<EventFamily, FamilyProfile>> = {
  wedding: {
    label: 'Wedding',
    labelHi: 'शादी',
    minWorkableLeadDays: 45,
    // Wedding guides keep 8–10% aside and call it non-negotiable (04 §8.1).
    contingencyFloorBp: 800,
    overrunPct: range(15, 20),
    sourceIds: ['S-WP-2026', 'S-VK-2026', 'S-INTEZAAM-D'],
  },
  birthday: {
    label: 'Birthday',
    labelHi: 'जन्मदिन',
    minWorkableLeadDays: 7,
    // Kids' parties run 40–60% over the first estimate, so a 10% buffer is kept (04 §5.1).
    contingencyFloorBp: 1_000,
    overrunPct: range(40, 60),
    sourceIds: ['S-CHARMBOX-2026', 'S-INTEZAAM-D'],
  },
  community: {
    label: 'Community event',
    labelHi: 'सामुदायिक आयोजन',
    minWorkableLeadDays: 30,
    // Community default buffer matches the wedding guidance (04 §8.1, grade D).
    contingencyFloorBp: 1_000,
    overrunPct: null,
    sourceIds: ['S-BMC-2026', 'S-INTEZAAM-D'],
  },
  'family-function': {
    label: 'Family function',
    labelHi: 'पारिवारिक समारोह',
    minWorkableLeadDays: 21,
    // "Never 0": the lower end of the 5–10% miscellaneous range for small functions (grade D).
    contingencyFloorBp: 500,
    overrunPct: null,
    sourceIds: ['S-OWNER-DEFAULTS', 'S-INTEZAAM-D'],
  },
};
