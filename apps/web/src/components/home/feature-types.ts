/**
 * The home page's feature catalogue: its seven groups and the shape of one feature tile.
 *
 * Responsibility: the closed list of groups the 42 features (synthesis §3) are shown
 * under — the brief's four nouns (budgets, timelines, vendor checklists, ideas) plus
 * Assistant, Community and Share — with each group's heading, line and icon, and where a
 * tile links. Boundary: copy and ids only; the tiles are listed in features-*.ts.
 */
import { type PlanAnchor } from '../features/panel-props';
import { type IconName } from '../ui/Icon';

export const FEATURE_GROUPS = [
  'budgets',
  'timelines',
  'vendors',
  'ideas',
  'assistant',
  'community',
  'share',
] as const;

export type FeatureGroupId = (typeof FEATURE_GROUPS)[number];

export interface FeatureGroupInfo {
  readonly title: string;
  readonly line: string;
  readonly icon: IconName;
}

export const FEATURE_GROUP_INFO: Readonly<Record<FeatureGroupId, FeatureGroupInfo>> = {
  budgets: {
    title: 'Budgets',
    line: 'A budget that always adds up, checked bottom-up, with levers when money is tight.',
    icon: 'wallet',
  },
  timelines: {
    title: 'Timelines',
    line: 'Counted back from your date, and compressed when time is short.',
    icon: 'calendar',
  },
  vendors: {
    title: 'Vendor checklists',
    line: 'What to ask, what to get in writing, and when to pay.',
    icon: 'clipboard',
  },
  ideas: {
    title: 'Ideas',
    line: 'Personal ideas, inside the limits your plan sets.',
    icon: 'sparkle',
  },
  assistant: {
    title: 'Assistant',
    line: 'Describe it, get a verdict with its reasons, then ask and adjust.',
    icon: 'chat',
  },
  community: {
    title: 'Community',
    line: 'Chanda, volunteers, permissions, guests and inclusion.',
    icon: 'people',
  },
  share: {
    title: 'Share',
    line: 'Send it to the family, the committee or a spreadsheet.',
    icon: 'share',
  },
};

/** A tile opens a place on the plan page, or the method and sources section of About. */
export type FeatureTarget = PlanAnchor | 'sources';

export interface Feature {
  /** The feature's row number in the product's feature list (1–42). */
  readonly id: number;
  readonly group: FeatureGroupId;
  readonly title: string;
  readonly body: string;
  readonly target: FeatureTarget;
}

/**
 * The link a feature tile points to.
 * @example
 * featureHref('money'); // '/plan#money'
 * featureHref('sources'); // '/about#sources'
 */
export function featureHref(target: FeatureTarget): string {
  return target === 'sources' ? '/about#sources' : `/plan#${target}`;
}
