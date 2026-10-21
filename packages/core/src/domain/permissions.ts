/**
 * Permissions and noise rules (PERM-01…08).
 *
 * Responsibility: the permissions a community or outdoor event may need — who issues
 * each, when it applies and what to verify — and the Noise Rules 2000 constants (curfew,
 * festive exemption, zone limits). Boundary: a checklist, not legal advice; every item
 * says "verify with your local police or municipal office", and states add their own rules.
 */
import type { RuleId } from './rule-ids.js';
import type { SourceId } from './sources.js';
import type { Confidence } from './source-types.js';

/** PERM-02: outdoor amplified sound is not allowed 10 pm–6 am (Rule 5, grade A). */
export const NOISE_CURFEW_START_HHMM = '22:00';
export const NOISE_CURFEW_END_HHMM = '06:00';

/** The State may allow sound until midnight on festive days, at most 15 a year (Rule 5). */
export const FESTIVE_EXEMPTION_END_HHMM = '00:00';
export const FESTIVE_EXEMPTION_MAX_DAYS = 15;

export const NOISE_ZONES = ['industrial', 'commercial', 'residential', 'silence'] as const;

export type NoiseZone = (typeof NOISE_ZONES)[number];

/** Ambient limits in dB(A) Leq, day 6 am–10 pm and night 10 pm–6 am (Schedule, grade A). */
export const NOISE_LIMITS_DBA: Readonly<Record<NoiseZone, { day: number; night: number }>> = {
  industrial: { day: 75, night: 70 },
  commercial: { day: 65, night: 55 },
  residential: { day: 55, night: 45 },
  silence: { day: 50, night: 40 },
};

/** PERM-03: silence zones extend about 100 m around hospitals, schools and courts (verify). */
export const SILENCE_ZONE_RADIUS_M = 100;

/** At a public place's boundary: ambient + 10 dB(A) or 75 dB(A), whichever is lower. */
export const LOUDSPEAKER_BOUNDARY_MAX_DBA = 75;
export const LOUDSPEAKER_ABOVE_AMBIENT_DBA = 10;

/** PERM-07: the Supreme Court's Diwali cracker window (2018 baseline; check each year). */
export const CRACKER_WINDOW = { startHhmm: '20:00', endHhmm: '22:00' } as const;

export const CRACKER_OCCASIONS = [
  'diwali',
  'gurpurab',
  'christmas-new-year',
  'southern-states-diwali',
] as const;

export type CrackerOccasion = (typeof CRACKER_OCCASIONS)[number];

/**
 * PERM-07 per occasion, from Arjun Gopal v. Union of India: direction (xiv) of 23 Oct 2018
 * ("Diwali or any other festivals"), modified 30 Oct and clarified 31 Oct 2018 (S-SCCONLINE-2018).
 * Green-only was ordered for Delhi-NCR, "not pan India"; elsewhere reduced-emission crackers.
 */
export const CRACKER_SLOTS: Readonly<Record<CrackerOccasion, string>> = {
  diwali: '8–10 pm (also the baseline for other festivals)',
  gurpurab: '4–5 am and 9–10 pm',
  'christmas-new-year': "11:55 pm–12:30 am on Christmas Eve and New Year's Eve",
  'southern-states-diwali':
    'Two hours chosen by the state government (Tamil Nadu, Puducherry and other southern states)',
};

export const PERMISSION_IDS = [
  'loudspeaker',
  'night-sound',
  'silence-zone',
  'pandal',
  'procession',
  'fire',
  'firecrackers',
  'society',
] as const;

export type PermissionId = (typeof PERMISSION_IDS)[number];

export interface PermissionInfo {
  readonly ruleId: RuleId;
  readonly title: string;
  readonly authority: string;
  readonly appliesWhen: string;
  readonly timing: string;
  readonly sourceIds: readonly SourceId[];
  readonly confidence: Confidence;
}

/** Shown under every permission: rules and offices differ by state and city. */
export const VERIFY_LOCALLY_NOTE = 'Verify with your local police station or municipal office.';

export const PERMISSIONS: Readonly<Record<PermissionId, PermissionInfo>> = {
  loudspeaker: {
    ruleId: 'PERM-01',
    title: 'Loudspeaker or PA permission',
    authority: 'District Magistrate, Police Commissioner or Deputy Commissioner (varies by state)',
    appliesWhen: 'Any amplified sound in the open',
    timing: 'Apply before the event; the office sets its own lead time',
    sourceIds: ['S-NOISE-RULE5-ND'],
    confidence: 'A',
  },
  'night-sound': {
    ruleId: 'PERM-02',
    title: 'No outdoor amplified sound from 10 pm to 6 am',
    authority: 'Noise Pollution (Regulation and Control) Rules, 2000',
    appliesWhen: 'Outdoor amplified sound that would run past 10 pm',
    timing:
      'Move indoors to a closed hall or end by 10 pm; a state festive exemption allows up to midnight on at most 15 days a year',
    sourceIds: ['S-NOISE-RULE5-ND'],
    confidence: 'A',
  },
  'silence-zone': {
    ruleId: 'PERM-03',
    title: 'Silence-zone limits near a hospital, school or court',
    authority: 'Noise Rules 2000 Schedule',
    appliesWhen:
      'The venue is within about 100 m of a hospital, school or court (verify the radius)',
    timing: 'Limits of 50 dB(A) by day and 40 dB(A) at night apply throughout',
    sourceIds: ['S-SILENCE-ZONE-2000', 'S-NOISE-SCHEDULE-2022'],
    confidence: 'A',
  },
  pandal: {
    ruleId: 'PERM-04',
    title: 'Pandal permission with police and traffic NOC',
    authority:
      'Municipal body plus local and traffic police (single window in Mumbai; SAHAJ portal in West Bengal)',
    appliesWhen: 'A pandal on a road, footpath or public ground',
    timing: 'Mumbai 2026: applications ran 14 Aug–13 Sep for Ganeshotsav',
    sourceIds: ['S-BMC-2026', 'S-SAHAJ-2026'],
    confidence: 'B',
  },
  procession: {
    ruleId: 'PERM-05',
    title: 'Procession route and immersion point',
    authority: 'Local police and traffic police',
    appliesWhen: 'A visarjan or any procession on public roads',
    timing: 'Separate from the pandal permission',
    sourceIds: ['S-IMMERSION-2026'],
    confidence: 'C',
  },
  fire: {
    ruleId: 'PERM-06',
    title: 'Fire safety clearance',
    authority: 'State fire service',
    appliesWhen: 'A pandal, stage, cooking or generator',
    timing: 'Before the structure goes up; keep extinguishers, isolate fuel, cover cables',
    sourceIds: ['S-MONEYLIFE-2017', 'S-THEPRINT-2026', 'S-NDMA-2014'],
    confidence: 'B',
  },
  firecrackers: {
    ruleId: 'PERM-07',
    title: 'Firecrackers: reduced-emission, within the allowed hours',
    authority: 'Supreme Court and state orders, renewed each year',
    appliesWhen: 'Any event with crackers',
    timing:
      "Diwali 8–10 pm; Gurpurab 4–5 am and 9–10 pm; Christmas and New Year 11:55 pm–12:30 am; green only in Delhi-NCR. Check this year's order",
    sourceIds: ['S-SCCONLINE-2018', 'S-LEAFLET-2025'],
    confidence: 'A',
  },
  society: {
    ruleId: 'PERM-08',
    title: 'RWA committee approval',
    authority: 'Your RWA or society managing committee',
    appliesWhen: 'An event inside a gated society or its common areas',
    timing: 'At a committee meeting before any money is collected',
    sourceIds: ['S-NOBROKERHOOD-ND'],
    confidence: 'C',
  },
};
