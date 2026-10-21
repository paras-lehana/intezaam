/**
 * The contract every workspace panel takes, and the anchors the plan page answers to.
 *
 * Responsibility: one props interface for the Overview, Money, Timeline, Vendors, People,
 * Ideas, Safety and Share panels — the computed plan, the context it came
 * from, today's date, a way to apply a typed change, and the AI narration with its state —
 * plus the closed list of `/plan#…` anchors the home page's feature tiles link to.
 * Boundary: types and ids only; panels and the plan page live with the features work.
 */
import type { ContextPatch, EventContext, Narration, Plan } from '@intezaam/core/schemas';

/** Where the AI narration is: not asked yet, on its way, arrived, or replaced by the offline planner. */
export type NarrationState = 'idle' | 'loading' | 'ready' | 'offline';

export interface PanelProps {
  readonly plan: Plan;
  readonly context: EventContext;
  /** The engine is pure: "today" is a parameter (YYYY-MM-DD, the reader's local day). */
  readonly todayIso: string;
  /** Applies a validated change (a lever, a what-if, an Ask proposal) and re-plans. */
  readonly onApplyPatch: (patch: ContextPatch) => void;
  readonly narration?: Narration | undefined;
  readonly narrationState: NarrationState;
  /**
   * BCP-47 tag of the language the narration is written in (the workspace derives it from
   * its provenance), so its text carries `lang`; unset reads as the page's English.
   */
  readonly narrationLang?: string | undefined;
  /** The confirmed brief was Hindi in Latin script: English drafts come back in Hinglish. */
  readonly hinglish?: boolean | undefined;
}

/** The eight workspace tabs, in tab order. */
export const WORKSPACE_TABS = [
  'overview',
  'money',
  'timeline',
  'vendors',
  'people',
  'ideas',
  'safety',
  'share',
] as const;

export type WorkspaceTab = (typeof WORKSPACE_TABS)[number];

export const WORKSPACE_TAB_LABELS: Readonly<Record<WorkspaceTab, string>> = {
  overview: 'Overview',
  money: 'Money',
  timeline: 'Timeline',
  vendors: 'Vendors',
  people: 'People',
  ideas: 'Ideas',
  safety: 'Safety',
  share: 'Share',
};

/**
 * Every `/plan#…` target: the details form, each tab, and the two tools reachable from
 * every tab (What-if and Ask).
 */
export const PLAN_ANCHORS = ['details', ...WORKSPACE_TABS, 'what-if', 'ask'] as const;

export type PlanAnchor = (typeof PLAN_ANCHORS)[number];

export const PLAN_ANCHOR_LABELS: Readonly<Record<PlanAnchor, string>> = {
  details: 'Your details',
  ...WORKSPACE_TAB_LABELS,
  'what-if': 'What if',
  ask: 'Ask Intezaam',
};

/**
 * Narrows a URL hash (without the `#`) to a known plan anchor.
 * @example
 * planAnchorFromHash('money'); // 'money'
 * planAnchorFromHash('nope'); // undefined
 */
export function planAnchorFromHash(hash: string): PlanAnchor | undefined {
  const id = hash.startsWith('#') ? hash.slice(1) : hash;
  return PLAN_ANCHORS.find((anchor) => anchor === id);
}
