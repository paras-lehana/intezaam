/**
 * Small closed choices on the planner form: venue setting, help level and premises.
 *
 * Responsibility: the option lists (with labels) the form, the brief reader and the
 * context schema share, so a new option is added in one place. Boundary: vocabulary.
 */

/** Indoor halls are closed premises for the noise rule; outdoor and mixed are rain-exposed. */
export const VENUE_SETTINGS = ['indoor', 'outdoor', 'mixed', 'home'] as const;

export type VenueSetting = (typeof VENUE_SETTINGS)[number];

export const VENUE_SETTING_LABELS: Readonly<Record<VenueSetting, string>> = {
  indoor: 'Indoor hall or banquet',
  outdoor: 'Open lawn or ground',
  mixed: 'Partly indoor, partly outdoor',
  home: 'At home',
};

/** Settings exposed to the open sky: rain risk (CTX-07) and the outdoor sound curfew apply. */
export const OPEN_AIR_SETTINGS: readonly VenueSetting[] = ['outdoor', 'mixed'];

/** Who does the work: drives task delegation and whether a planner line appears. */
export const HELP_LEVELS = ['diy', 'family', 'planner'] as const;

export type HelpLevel = (typeof HELP_LEVELS)[number];

export const HELP_LEVEL_LABELS: Readonly<Record<HelpLevel, string>> = {
  diy: 'Doing it ourselves',
  family: 'Family and friends are helping',
  planner: 'Hiring a planner',
};

/** Public premises (roads, grounds) need pandal and police permissions; private ones do not. */
export const PREMISES = ['public', 'private'] as const;

export type Premises = (typeof PREMISES)[number];

export const PREMISES_LABELS: Readonly<Record<Premises, string>> = {
  public: 'Public road or ground',
  private: 'Inside a society, temple or private ground',
};
