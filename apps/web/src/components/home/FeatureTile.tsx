/**
 * One feature tile: a small ledger card whose title links to the place that does it.
 *
 * Responsibility: consistent tile markup — an h4 per tile (the bento is navigable by
 * heading), the link on the title (so its name is the feature), and a "stretched" hit
 * area that makes the whole card clickable for pointer users. Boundary: presentation only.
 */
import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { PLAN_ANCHOR_LABELS } from '../features/panel-props';
import { type Feature, featureHref } from './feature-types';

export interface FeatureTileProps {
  readonly feature: Feature;
}

/** Where the tile's link opens, said in words (the link name is only the feature). */
function destination(feature: Feature): string {
  return feature.target === 'sources' ? 'How it works' : PLAN_ANCHOR_LABELS[feature.target];
}

export function FeatureTile({ feature }: FeatureTileProps): ReactElement {
  return (
    <li className="feature-tile lift">
      <h4 className="feature-tile__title">
        <Link className="feature-tile__link" to={featureHref(feature.target)}>
          {feature.title}
        </Link>
      </h4>
      <p className="feature-tile__body">{feature.body}</p>
      <p className="feature-tile__where">
        <span aria-hidden="true">→ </span>
        {destination(feature)}
      </p>
    </li>
  );
}
