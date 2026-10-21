/**
 * Event kind profiles — the defaults each occasion starts from.
 *
 * Responsibility: for every event kind, its family, labels, default and typical guest
 * counts, default functions and age band, with the source of each default (birthday
 * ranges are published; other defaults are the owner's planner values or our
 * assumptions, grade D). Boundary: defaults only; the user's context always wins.
 */
import type { AgeBand, EventFamily, EventKind } from './events.js';
import { EVENT_KINDS } from './events.js';
import type { FunctionKind } from './functions.js';
import type { SourceId } from './sources.js';
import type { Confidence } from './source-types.js';
import type { NumberRange } from './units.js';
import { range } from './units.js';

export interface EventKindProfile {
  readonly family: EventFamily;
  readonly label: string;
  readonly labelHi: string;
  /** Pre-filled guest count when the brief gives none (mid-point of the typical range). */
  readonly defaultGuests: number;
  /** Typical guest range from the source, shown as context next to the guest field. */
  readonly typicalGuests: NumberRange | null;
  /** Functions planned when the user picks none (traditions may replace them for weddings). */
  readonly defaultFunctions: readonly FunctionKind[];
  readonly ageBand: AgeBand | null;
  readonly sourceId: SourceId;
  readonly confidence: Confidence;
}

/** Shorthand rows keep the 18 kinds on one screen; every value is documented above the row. */
function kind(
  family: EventFamily,
  label: string,
  labelHi: string,
  defaults: { guests: number; typical: NumberRange | null; functions: readonly FunctionKind[] },
  provenance: { sourceId: SourceId; confidence: Confidence; ageBand?: AgeBand },
): EventKindProfile {
  return {
    family,
    label,
    labelHi,
    defaultGuests: defaults.guests,
    typicalGuests: defaults.typical,
    defaultFunctions: defaults.functions,
    ageBand: provenance.ageBand ?? null,
    sourceId: provenance.sourceId,
    confidence: provenance.confidence,
  };
}

const OWNER = { sourceId: 'S-OWNER-DEFAULTS', confidence: 'D' } as const;
const ASSUMED = { sourceId: 'S-INTEZAAM-D', confidence: 'D' } as const;
/** Birthday guest ranges are published; the default is our mid-point. */
const BIRTHDAY_RANGES = { sourceId: 'S-CHARMBOX-2026', confidence: 'C' } as const;

export const EVENT_KIND_PROFILES: Readonly<Record<EventKind, EventKindProfile>> = {
  wedding: kind(
    'wedding',
    'Wedding',
    'शादी',
    {
      guests: 300,
      typical: null,
      functions: ['haldi', 'mehendi', 'sangeet', 'wedding', 'reception'],
    },
    OWNER,
  ),
  'first-birthday': kind(
    'birthday',
    'First birthday',
    'पहला जन्मदिन',
    { guests: 35, typical: range(20, 50), functions: ['party'] },
    { ...BIRTHDAY_RANGES, ageBand: 'baby' },
  ),
  'kids-birthday': kind(
    'birthday',
    "Kids' birthday (5–12)",
    'बच्चों का जन्मदिन',
    { guests: 30, typical: range(10, 60), functions: ['party'] },
    { ...BIRTHDAY_RANGES, ageBand: 'kid' },
  ),
  'teen-birthday': kind(
    'birthday',
    'Teen birthday (13–17)',
    'किशोर जन्मदिन',
    { guests: 25, typical: range(10, 40), functions: ['party'] },
    { ...ASSUMED, ageBand: 'teen' },
  ),
  'milestone-birthday': kind(
    'birthday',
    'Milestone birthday (18, 21, 30, 40, 50)',
    'ख़ास जन्मदिन',
    { guests: 80, typical: range(30, 150), functions: ['party'] },
    { ...ASSUMED, ageBand: 'adult' },
  ),
  'sixtieth-birthday': kind(
    'birthday',
    '60th birthday (Shashtiabdapurti)',
    'षष्ट्यब्दपूर्ति',
    { guests: 150, typical: range(50, 300), functions: ['puja', 'meal'] },
    { sourceId: 'S-WIKI-SHASHTHIPURTI', confidence: 'B', ageBand: 'elder' },
  ),
  'festival-pandal': kind(
    'community',
    'Festival pandal (Ganesh, Durga Puja, Navratri)',
    'त्योहार पंडाल',
    { guests: 1_000, typical: null, functions: ['puja', 'bhog', 'cultural-night', 'visarjan'] },
    ASSUMED,
  ),
  'society-festival': kind(
    'community',
    'Society festival or mela',
    'सोसाइटी उत्सव या मेला',
    { guests: 400, typical: null, functions: ['puja', 'cultural-night', 'bhog'] },
    ASSUMED,
  ),
  'religious-gathering': kind(
    'community',
    'Satsang or religious gathering',
    'सत्संग या धार्मिक सभा',
    { guests: 200, typical: null, functions: ['satsang', 'bhog'] },
    ASSUMED,
  ),
  'rwa-function': kind(
    'community',
    'Cultural night or RWA function',
    'सांस्कृतिक संध्या या RWA कार्यक्रम',
    { guests: 250, typical: null, functions: ['cultural-night', 'meal'] },
    ASSUMED,
  ),
  'charity-fundraiser': kind(
    'community',
    'Charity or fundraiser',
    'चैरिटी या धन संग्रह',
    { guests: 150, typical: null, functions: ['fundraiser'] },
    ASSUMED,
  ),
  engagement: kind(
    'family-function',
    'Engagement or roka',
    'सगाई या रोका',
    { guests: 150, typical: null, functions: ['engagement'] },
    OWNER,
  ),
  anniversary: kind(
    'family-function',
    'Anniversary',
    'सालगिरह',
    { guests: 60, typical: null, functions: ['party'] },
    OWNER,
  ),
  'griha-pravesh': kind(
    'family-function',
    'Griha pravesh (housewarming)',
    'गृह प्रवेश',
    { guests: 50, typical: null, functions: ['puja', 'meal'] },
    OWNER,
  ),
  'home-puja': kind(
    'family-function',
    'Puja, path or katha',
    'पूजा, पाठ या कथा',
    { guests: 30, typical: null, functions: ['puja', 'meal'] },
    OWNER,
  ),
  'naming-mundan': kind(
    'family-function',
    'Naming ceremony or mundan',
    'नामकरण या मुंडन',
    { guests: 40, typical: null, functions: ['puja', 'meal'] },
    OWNER,
  ),
  'baby-shower': kind(
    'family-function',
    'Baby shower (godh bharai)',
    'गोद भराई',
    { guests: 60, typical: null, functions: ['ceremony', 'meal'] },
    OWNER,
  ),
  retirement: kind(
    'family-function',
    'Retirement',
    'सेवानिवृत्ति',
    { guests: 80, typical: null, functions: ['party'] },
    OWNER,
  ),
};

/**
 * The kinds that belong to one family, in picker order.
 * @example
 * kindsOfFamily('birthday')[0]; // 'first-birthday'
 */
export function kindsOfFamily(family: EventFamily): EventKind[] {
  return EVENT_KINDS.filter((candidate) => EVENT_KIND_PROFILES[candidate].family === family);
}
