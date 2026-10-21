/**
 * Words for the idea and message vocabularies (closed unions from core → display text).
 *
 * Responsibility: one label per idea category, effort level, "why it fits" signal, draft
 * kind and tone, keyed by core's closed unions so a new key without words is a compile
 * error. Boundary: display text only.
 */
import type { CostBand, EffortLevel, IdeaCategory, SignalKey } from '@intezaam/core/domain';
import type { DRAFT_KINDS, DRAFT_TONES } from '@intezaam/core/schemas';

export type DraftKind = (typeof DRAFT_KINDS)[number];
export type DraftTone = (typeof DRAFT_TONES)[number];

export const IDEA_CATEGORY_LABELS: Readonly<Record<IdeaCategory, string>> = {
  theme: 'Themes',
  decor: 'Decor',
  menu: 'Menu',
  activity: 'Activities',
  music: 'Music',
  favours: 'Favours and return gifts',
};

export const EFFORT_LABELS: Readonly<Record<EffortLevel, string>> = {
  low: 'Little effort',
  med: 'Some effort',
  high: 'A lot of effort',
};

/** A text glyph per cost band, so the band reads without colour (saves ↓, within =, splurge ↑). */
export const COST_BAND_GLYPHS: Readonly<Record<CostBand, string>> = {
  saves: '↓',
  within: '=',
  splurge: '↑',
};

export const SIGNAL_LABELS: Readonly<Record<SignalKey, string>> = {
  budget: 'your budget',
  guests: 'your guest count',
  season: 'the season',
  setting: 'your venue',
  diet: 'your menu',
  'age-band': 'the age group',
  style: 'your style',
  tradition: 'your tradition',
  accessibility: 'guests who need care',
  city: 'your city',
  eco: 'going green',
};

export const DRAFT_KIND_LABELS: Readonly<Record<DraftKind, string>> = {
  'vendor-enquiry': 'Vendor enquiry',
  invitation: 'Invitation',
  'rsvp-reminder': 'RSVP reminder',
  'volunteer-brief': 'Volunteer brief',
  'thank-you': 'Thank-you note',
  'plan-summary': 'Plan summary',
};

export const DRAFT_TONE_LABELS: Readonly<Record<DraftTone, string>> = {
  warm: 'Warm',
  formal: 'Formal',
};
