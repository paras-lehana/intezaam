/**
 * Every feature tile on the home page, in one list.
 *
 * Responsibility: join the three tile lists and answer "which tiles belong to this group"
 * for the bento. Boundary: data plumbing only; copy lives in features-*.ts.
 */
import { DECIDE_FEATURES } from './features-decide';
import { PLAN_FEATURES } from './features-plan';
import { SHARE_FEATURES } from './features-share';
import { type Feature, type FeatureGroupId } from './feature-types';

/** All 42 features; ids are the rows of the product's feature list. */
export const FEATURES: readonly Feature[] = [
  ...DECIDE_FEATURES,
  ...PLAN_FEATURES,
  ...SHARE_FEATURES,
];

/**
 * The tiles of one group, in display order.
 * @example
 * featuresInGroup('ideas').map((feature) => feature.id); // [29, 30, 31]
 */
export function featuresInGroup(group: FeatureGroupId): readonly Feature[] {
  return FEATURES.filter((feature) => feature.group === group);
}
