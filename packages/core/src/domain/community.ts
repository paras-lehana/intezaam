/**
 * Community money and people (COM-01…05) — chanda, sponsors and volunteers.
 *
 * Responsibility: contribution rounding, flat-size weights for tiered contributions,
 * the volunteer roles with their ratios, and sponsor ideas for society festivals.
 * Boundary: defaults the committee edits; the community engine computes.
 */
import type { SourceId } from './sources.js';
import type { Confidence } from './source-types.js';

/** COM-01: per-household amounts are rounded up to the next ₹10 so collection stays simple. */
export const CONTRIBUTION_ROUNDING_INR = 10;

export const FLAT_SIZES = ['small', 'medium', 'large'] as const;

export type FlatSize = (typeof FLAT_SIZES)[number];

/** COM-02: larger flats pay more (grade D defaults the committee can edit). */
export const FLAT_SIZE_WEIGHTS: Readonly<Record<FlatSize, number>> = {
  small: 0.75,
  medium: 1,
  large: 1.25,
};

export const VOLUNTEER_ROLES = [
  'committee-lead',
  'treasurer',
  'decor-team',
  'food-team',
  'games-cultural',
  'crowd-marshal',
  'first-aid',
  'help-desk',
  'sound-power',
  'accessibility',
] as const;

export type VolunteerRole = (typeof VOLUNTEER_ROLES)[number];

export interface VolunteerRoleInfo {
  readonly label: string;
  readonly duty: string;
  /** COM-04: one per this many attendees (crowd marshals); null = a fixed count of one. */
  readonly attendeesPerVolunteer: number | null;
  readonly sourceId: SourceId;
  readonly confidence: Confidence;
}

/** COM-04: about one crowd marshal per 100 attendees (our reading of NDMA 2014; grade D). */
export const ATTENDEES_PER_MARSHAL = 100;

export const VOLUNTEER_ROLE_INFO: Readonly<Record<VolunteerRole, VolunteerRoleInfo>> = {
  'committee-lead': {
    label: 'Committee lead',
    duty: 'Overall coordination, permissions and funds',
    attendeesPerVolunteer: null,
    sourceId: 'S-NOBROKERHOOD-ND',
    confidence: 'C',
  },
  treasurer: {
    label: 'Treasurer',
    duty: 'Collections, receipts and sponsor invoices',
    attendeesPerVolunteer: null,
    sourceId: 'S-INTEZAAM-D',
    confidence: 'D',
  },
  'decor-team': {
    label: 'Decor team',
    duty: 'Decoration and lighting',
    attendeesPerVolunteer: null,
    sourceId: 'S-NOBROKERHOOD-ND',
    confidence: 'C',
  },
  'food-team': {
    label: 'Food team',
    duty: 'Refreshments, prasad and a food-safety check',
    attendeesPerVolunteer: null,
    sourceId: 'S-NOBROKERHOOD-ND',
    confidence: 'C',
  },
  'games-cultural': {
    label: 'Games and cultural programme',
    duty: 'Games, competitions and performances',
    attendeesPerVolunteer: null,
    sourceId: 'S-NOBROKERHOOD-ND',
    confidence: 'C',
  },
  'crowd-marshal': {
    label: 'Crowd marshals',
    duty: 'Entry, exits and queues, in high-visibility vests',
    attendeesPerVolunteer: ATTENDEES_PER_MARSHAL,
    sourceId: 'S-NDMA-2014',
    confidence: 'D',
  },
  'first-aid': {
    label: 'First aid',
    duty: 'The first-aid post and ambulance liaison',
    attendeesPerVolunteer: null,
    sourceId: 'S-NDMA-2014',
    confidence: 'A',
  },
  'help-desk': {
    label: 'Help desk',
    duty: 'Lost and found, missing children and PA announcements',
    attendeesPerVolunteer: null,
    sourceId: 'S-NDMA-2014',
    confidence: 'A',
  },
  'sound-power': {
    label: 'Sound and power',
    duty: 'Sound within permitted hours; generator safety',
    attendeesPerVolunteer: null,
    sourceId: 'S-NOISE-RULE5-ND',
    confidence: 'A',
  },
  accessibility: {
    label: 'Accessibility helpers',
    duty: 'Help for elderly and disabled guests with seating and wheelchairs',
    attendeesPerVolunteer: null,
    sourceId: 'S-INTEZAAM-D',
    confidence: 'D',
  },
};

/** Sponsors give in return for a stall or banner (S-NOBROKERHOOD-ND); the pairings are ours. */
export const SPONSOR_IDEAS: readonly string[] = [
  'Local sweet shops and caterers: a stall plus a banner',
  'Jewellers and clothing shops: festive offers at a stall',
  'Banks and insurers: a help desk',
  'Schools and coaching centres: the children’s competitions',
  'Clinics and pharmacies: the first-aid tent',
];
