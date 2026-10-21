/**
 * Crowd safety (CTX-06, CROWD-01…05) from the NDMA guide on mass gatherings (2014).
 *
 * Responsibility: crowd classes by expected footfall and the checklist items each class
 * or feature (stalls, temporary structures) adds. Boundary: the checklist only; NDMA's
 * newer 2025 guidance exists but was not reviewed.
 */
import type { RuleId } from './rule-ids.js';

export const CROWD_CLASSES = ['small', 'medium', 'large', 'very-large'] as const;

export type CrowdClass = (typeof CROWD_CLASSES)[number];

/** Upper footfall for each class; above 1,000 is very large (NDMA 2014 triggers). */
export const CROWD_CLASS_MAX: Readonly<Record<Exclude<CrowdClass, 'very-large'>, number>> = {
  small: 200,
  medium: 500,
  large: 1_000,
};

/**
 * CTX-06: the crowd class for an expected footfall.
 * @example
 * crowdClassFor(600); // 'large'
 */
export function crowdClassFor(footfall: number): CrowdClass {
  if (footfall <= CROWD_CLASS_MAX.small) return 'small';
  if (footfall <= CROWD_CLASS_MAX.medium) return 'medium';
  return footfall <= CROWD_CLASS_MAX.large ? 'large' : 'very-large';
}

export const CROWD_CHECK_IDS = [
  'exits',
  'first-aid',
  'visible-staff',
  'holding-areas',
  'pa-cctv',
  'missing-children',
  'ambulance',
  'mock-drill',
  'fire-electrical',
  'structure-load',
  'stall-spacing',
  'licensed-food',
] as const;

export type CrowdCheckId = (typeof CROWD_CHECK_IDS)[number];

/** What switches a check on: every event, a footfall above a class, or a feature. */
export type CrowdTrigger =
  | { readonly kind: 'always' }
  | { readonly kind: 'above'; readonly footfall: number }
  | { readonly kind: 'feature'; readonly feature: 'structure' | 'stalls' };

export interface CrowdCheck {
  readonly ruleId: RuleId;
  readonly title: string;
  readonly trigger: CrowdTrigger;
}

const ALWAYS: CrowdTrigger = { kind: 'always' };

export const CROWD_CHECKS: Readonly<Record<CrowdCheckId, CrowdCheck>> = {
  exits: {
    ruleId: 'CROWD-01',
    title: 'Keep every exit unlocked and unobstructed',
    trigger: ALWAYS,
  },
  'first-aid': { ruleId: 'CROWD-01', title: 'Run a first-aid post', trigger: ALWAYS },
  'visible-staff': {
    ruleId: 'CROWD-02',
    title: 'Crowd-control staff in high-visibility vests who can talk to the crowd',
    trigger: { kind: 'above', footfall: CROWD_CLASS_MAX.small },
  },
  'holding-areas': {
    ruleId: 'CROWD-03',
    title: 'Holding areas and queues instead of open crowding',
    trigger: { kind: 'above', footfall: CROWD_CLASS_MAX.medium },
  },
  'pa-cctv': {
    ruleId: 'CROWD-03',
    title: 'A public address system and CCTV at entries, exits and bottlenecks',
    trigger: { kind: 'above', footfall: CROWD_CLASS_MAX.medium },
  },
  'missing-children': {
    ruleId: 'CROWD-03',
    title: 'A missing-children and help desk, announced on the PA',
    trigger: { kind: 'above', footfall: CROWD_CLASS_MAX.medium },
  },
  ambulance: {
    ruleId: 'CROWD-04',
    title: 'An ambulance on standby with a clear exit route; emergency numbers displayed',
    trigger: { kind: 'above', footfall: CROWD_CLASS_MAX.large },
  },
  'mock-drill': {
    ruleId: 'CROWD-04',
    title: 'A mock drill for medical evacuation',
    trigger: { kind: 'above', footfall: CROWD_CLASS_MAX.large },
  },
  'fire-electrical': {
    ruleId: 'PERM-06',
    title: 'Extinguishers at critical points; generators and fuel fenced; cables covered',
    trigger: { kind: 'feature', feature: 'structure' },
  },
  'structure-load': {
    ruleId: 'CROWD-01',
    title: 'Confirm the stage or pandal can bear the load, with a safety margin',
    trigger: { kind: 'feature', feature: 'structure' },
  },
  'stall-spacing': {
    ruleId: 'CROWD-05',
    title: 'Stalls on one side, with a 3–4 m gap after every 5–6 stalls',
    trigger: { kind: 'feature', feature: 'stalls' },
  },
  'licensed-food': {
    ruleId: 'CROWD-05',
    title: 'Only licensed food vendors, with ID cards',
    trigger: { kind: 'feature', feature: 'stalls' },
  },
};
