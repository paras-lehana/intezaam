/**
 * Shared end-to-end inputs.
 *
 * Responsibility: the routes, workspace tabs, section names, pinned day and typed briefs the journeys use. The
 * briefs are typed into an empty box exactly as a family would write them; they are not built-in samples, so
 * typing them also proves nothing is prefilled. Boundary: inputs only — expectations come from expected.ts and
 * live in the specs.
 */

/** Every route a visitor can reach from the header. */
export const ROUTES = ['/', '/plan', '/about'] as const;

/** The plan workspace tabs, in order. */
export const WORKSPACE_TABS = [
  /^overview/i,
  /^money/i,
  /^timeline/i,
  /^vendors/i,
  /^people/i,
  /^ideas/i,
  /^safety/i,
  /^share/i,
] as const;

/**
 * The workspace sections the specs look inside, by their heading (each section is a region
 * named by its h3), so a match never comes from a panel's fixed intro text.
 */
export const SECTIONS = {
  riskRadar: /^risk radar$/i,
  accessPlan: /^accessibility and elders$/i,
  dateNotes: /^about your date$/i,
} as const;

/**
 * The browser's "today" for specs that compare the screen with the engine's own plan. Four
 * months on, the Jaipur sample lands on 21 Feb 2027, inside the curated muhurat range
 * (Nov 2026–Dec 2027), so the wedding-date journey stays meaningful whenever it runs.
 */
export const PINNED_TODAY_ISO = '2026-10-21';

/** Meena's wedding, the way a parent would type it (Hinglish; no date, so the form must ask for it). */
export const MEENA_BRIEF =
  'Beti ki shaadi Jaipur mein, 300 log, 25 lakh budget, mehendi sangeet wedding reception, sangeet outdoor DJ ke saath';

/** A plan needs the browser engine plus, for narration, the model or the offline twin; allow for a cold model. */
export const PLAN_TIMEOUT_MS = 90_000;
