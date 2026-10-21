/**
 * Guest-list rules: statuses, diets and sides understood in English, Hindi and Hinglish, and
 * the headcount that counts people, not rows.
 *
 * Responsibility: a typed port of the owner's earlier guest manager:
 * "haan" means confirmed, "NV" means non-veg, "ladkiwale" means the bride's
 * side; a declined party is never counted; plates are the adults and children of confirmed
 * parties. Boundary: pure functions over in-memory rows — the list lives only in this
 * browser tab and is never sent to the server or to the AI.
 */

export const GUEST_STATUSES = ['invited', 'confirmed', 'tentative', 'declined', 'arrived'] as const;
export type GuestStatus = (typeof GUEST_STATUSES)[number];

export const GUEST_DIETS = ['veg', 'non-veg', 'jain', 'no-preference'] as const;
export type GuestDiet = (typeof GUEST_DIETS)[number];

export const GUEST_SIDES = ['bride', 'groom', 'both'] as const;
export type GuestSide = (typeof GUEST_SIDES)[number];

export const GUEST_STATUS_LABELS: Readonly<Record<GuestStatus, string>> = {
  invited: 'Invited',
  confirmed: 'Confirmed',
  tentative: 'Maybe',
  declined: 'Declined',
  arrived: 'Arrived',
};

export const GUEST_DIET_LABELS: Readonly<Record<GuestDiet, string>> = {
  veg: 'Veg',
  'non-veg': 'Non-veg',
  jain: 'Jain',
  'no-preference': 'No preference',
};

export const GUEST_SIDE_LABELS: Readonly<Record<GuestSide, string>> = {
  bride: 'Bride’s side',
  groom: 'Groom’s side',
  both: 'Both / common',
};

/** One party on the list: a family or a single guest. People are adults plus children. */
export interface Guest {
  readonly id: string;
  readonly name: string;
  readonly side: GuestSide;
  readonly adults: number;
  readonly kids: number;
  readonly diet: GuestDiet;
  readonly status: GuestStatus;
}

/** Free-text RSVP words → status (blank means not replied yet). */
const STATUS_WORDS: Readonly<Record<string, GuestStatus>> = {
  '': 'invited',
  invited: 'invited',
  pending: 'invited',
  awaiting: 'invited',
  'not replied': 'invited',
  confirmed: 'confirmed',
  yes: 'confirmed',
  y: 'confirmed',
  coming: 'confirmed',
  attending: 'confirmed',
  going: 'confirmed',
  accepted: 'confirmed',
  haan: 'confirmed',
  ha: 'confirmed',
  'aa rahe': 'confirmed',
  declined: 'declined',
  no: 'declined',
  n: 'declined',
  'not coming': 'declined',
  regret: 'declined',
  regrets: 'declined',
  cancelled: 'declined',
  nahi: 'declined',
  tentative: 'tentative',
  maybe: 'tentative',
  'may be': 'tentative',
  'not sure': 'tentative',
  shayad: 'tentative',
  arrived: 'arrived',
  'checked in': 'arrived',
  'checked-in': 'arrived',
  present: 'arrived',
};

/**
 * Diet words in priority order. "No onion / no garlic" goes to the Jain counter
 * before "veg" can match: Jain food has neither, while ordinary veg dishes usually have both,
 * so it is the counter that guest can eat from safely.
 */
const DIET_PATTERNS: readonly (readonly [RegExp, GuestDiet])[] = [
  [/jain|no onion|no garlic/, 'jain'],
  [/non[\s-]?veg|nonveg|\bnv\b|egg|chicken|mutton|meat|fish|mansahari|मांसाहारी/, 'non-veg'],
  [/^(no pref(erence)?|any|anything|both|either)$/, 'no-preference'],
  [/veg|shakahari|शाकाहारी|satvik|sattvic|vegan/, 'veg'],
];

/** Side words: ladkiwale / vadhu = bride's family; ladkewale / var = groom's. */
const SIDE_PATTERNS: readonly (readonly [RegExp, GuestSide])[] = [
  [/bride|ladki|girl|vadhu|वधू/, 'bride'],
  [/groom|ladke|boy|\bvar\b|वर/, 'groom'],
  [/both|common|mutual|dono|दोनों/, 'both'],
];

/**
 * Lower-cases, folds curly apostrophes and collapses spaces, so "Not  Coming" matches.
 * @example
 * wordKey('  Aa  Rahe '); // 'aa rahe'
 */
export function wordKey(value: string): string {
  return value.trim().toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, ' ');
}

function firstMatch<T>(patterns: readonly (readonly [RegExp, T])[], key: string, fallback: T): T {
  if (key === '') return fallback;
  return patterns.find(([pattern]) => pattern.test(key))?.[1] ?? fallback;
}

/**
 * An RSVP word as a status; unknown words keep the fallback.
 * @example
 * readStatus('haan'); // 'confirmed'
 * readStatus('nahi'); // 'declined'
 */
export function readStatus(value: string, fallback: GuestStatus = 'invited'): GuestStatus {
  return STATUS_WORDS[wordKey(value)] ?? fallback;
}

/**
 * A diet word as a diet; blank or unknown keeps the fallback.
 * @example
 * readDiet('NV'); // 'non-veg'
 * readDiet('shakahari'); // 'veg'
 */
export function readDiet(value: string, fallback: GuestDiet = 'veg'): GuestDiet {
  return firstMatch(DIET_PATTERNS, wordKey(value), fallback);
}

/**
 * A side word as a side; blank or unknown keeps the fallback.
 * @example
 * readSide('ladkiwale'); // 'bride'
 */
export function readSide(value: string, fallback: GuestSide = 'both'): GuestSide {
  return firstMatch(SIDE_PATTERNS, wordKey(value), fallback);
}

/**
 * Narrows a select's value to one of its typed options.
 * @example
 * pickOption(GUEST_DIETS, 'no-preference', 'veg'); // 'no-preference'
 */
export function pickOption<T extends string>(options: readonly T[], value: string, fallback: T): T {
  return options.find((option) => option === value) ?? fallback;
}

/** Counts for the list: people, not rows. */
export interface GuestCounts {
  readonly parties: number;
  readonly people: number;
  /** Everyone not declined. */
  readonly expected: number;
  /** Confirmed plus arrived: one plate each for the caterer. */
  readonly confirmed: number;
  readonly declined: number;
  /** Invited or maybe: still to answer. */
  readonly awaiting: number;
  readonly diet: Readonly<Record<GuestDiet, number>>;
  readonly side: Readonly<Record<GuestSide, number>>;
}

/** Fresh tallies; every key present, so a missing diet or side is a compile error. */
function emptyDietTally(): Record<GuestDiet, number> {
  return { veg: 0, 'non-veg': 0, jain: 0, 'no-preference': 0 };
}

function emptySideTally(): Record<GuestSide, number> {
  return { bride: 0, groom: 0, both: 0 };
}

const ATTENDING: ReadonlySet<GuestStatus> = new Set(['confirmed', 'arrived']);

/**
 * Headcount of a guest list: people, not rows; declined parties never count; diet counts
 * come from confirmed parties only (one plate each — what the caterer needs to know).
 * @example
 * countGuests([{ id: 'g1', name: 'Sharma ji', side: 'bride', adults: 2, kids: 1, diet: 'veg', status: 'confirmed' }]).confirmed; // 3
 */
export function countGuests(guests: readonly Guest[]): GuestCounts {
  const diet = emptyDietTally();
  const side = emptySideTally();
  let people = 0;
  let expected = 0;
  let confirmed = 0;
  let declined = 0;
  // Efficiency: one pass over the list however long it grows (a contacts import can be thousands).
  for (const guest of guests) {
    const party = guest.adults + guest.kids;
    people += party;
    if (guest.status === 'declined') {
      declined += party;
      continue;
    }
    expected += party;
    side[guest.side] += party;
    if (ATTENDING.has(guest.status)) {
      confirmed += party;
      diet[guest.diet] += party;
    }
  }
  return {
    parties: guests.length,
    people,
    expected,
    confirmed,
    declined,
    awaiting: expected - confirmed,
    diet,
    side,
  };
}
