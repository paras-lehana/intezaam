/**
 * Accessibility and elders checklist (ACC-01…06).
 *
 * Responsibility: the needs a host can tick (elderly guests, wheelchair users, young
 * children) and the venue and day-of checks each need adds, from India's 2021
 * Harmonised Guidelines and the NDMA crowd guide. Boundary: checklist text and
 * triggers only; the engine turns ticked needs into tasks and vendor questions.
 */
import type { RuleId } from './rule-ids.js';
import type { SourceId } from './sources.js';
import type { Confidence } from './source-types.js';

export const ACCESS_NEEDS = ['elderly', 'wheelchair', 'kids'] as const;

export type AccessNeed = (typeof ACCESS_NEEDS)[number];

export const ACCESS_NEED_LABELS: Readonly<Record<AccessNeed, string>> = {
  elderly: 'Elderly guests',
  wheelchair: 'Wheelchair users',
  kids: 'Young children',
};

export const ACCESS_ITEM_IDS = [
  'ramp',
  'accessible-toilet',
  'step-free-route',
  'elder-seating',
  'first-aid',
  'lit-paths',
] as const;

export type AccessItemId = (typeof ACCESS_ITEM_IDS)[number];

export interface AccessItem {
  readonly ruleId: RuleId;
  readonly title: string;
  readonly detail: string;
  /** Needs that add this item; an empty list means it applies to every event. */
  readonly needs: readonly AccessNeed[];
  readonly sourceId: SourceId;
  readonly confidence: Confidence;
}

export const ACCESSIBILITY_ITEMS: Readonly<Record<AccessItemId, AccessItem>> = {
  ramp: {
    ruleId: 'ACC-01',
    title: 'Ramp at every step',
    detail: 'Gradient 1:12 for a run up to about 6 m, clear width at least 1,200 mm.',
    needs: ['wheelchair', 'elderly'],
    sourceId: 'S-GKTODAY-2021',
    confidence: 'A',
  },
  'accessible-toilet': {
    ruleId: 'ACC-02',
    title: 'At least one accessible toilet',
    detail: 'Grab bars and a low washbasin, on the ground floor or near the lobby.',
    needs: ['wheelchair', 'elderly'],
    sourceId: 'S-SCPD-2025',
    confidence: 'A',
  },
  'step-free-route': {
    ruleId: 'ACC-03',
    title: 'Step-free route from drop-off to seating',
    detail: 'Drop-off close to the entrance; a shuttle from distant parking.',
    needs: ['wheelchair', 'elderly'],
    sourceId: 'S-INTEZAAM-D',
    confidence: 'D',
  },
  'elder-seating': {
    ruleId: 'ACC-04',
    title: 'Reserved seating for elders',
    detail:
      'Chairs near the stage or mandap, exits and toilets, away from the speakers; seating during long rituals.',
    needs: ['elderly'],
    sourceId: 'S-INTEZAAM-D',
    confidence: 'D',
  },
  'first-aid': {
    ruleId: 'ACC-05',
    title: 'First-aid post and ambulance access',
    detail: "Note guests' medicines and keep diabetic-friendly food at the counters.",
    needs: [],
    sourceId: 'S-NDMA-2014',
    confidence: 'A',
  },
  'lit-paths': {
    ruleId: 'ACC-06',
    title: 'Lit paths and covered cables',
    detail: 'Light every path after dark and cover cable runs to remove trip hazards.',
    needs: [],
    sourceId: 'S-NDMA-2014',
    confidence: 'A',
  },
};

/**
 * The checklist items that apply to the ticked needs (always-on items included).
 * @example
 * accessItemsFor(['elderly']).includes('elder-seating'); // true
 */
export function accessItemsFor(needs: readonly AccessNeed[]): AccessItemId[] {
  return ACCESS_ITEM_IDS.filter((id) => {
    const item = ACCESSIBILITY_ITEMS[id];
    return item.needs.length === 0 || item.needs.some((need) => needs.includes(need));
  });
}
