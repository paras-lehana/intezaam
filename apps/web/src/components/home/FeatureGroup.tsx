/**
 * One group of the feature bento: an icon, an h3, a line and its tiles.
 *
 * Responsibility: label each group as a region so the 42 tiles are navigable in seven
 * steps. Boundary: presentation only; the tiles come from features.ts.
 */
import type { ReactElement } from 'react';
import { Icon } from '../ui/Icon';
import { FEATURE_GROUP_INFO, type FeatureGroupId } from './feature-types';
import { FeatureTile } from './FeatureTile';
import { featuresInGroup } from './features';

export interface FeatureGroupProps {
  readonly group: FeatureGroupId;
}

export function FeatureGroup({ group }: FeatureGroupProps): ReactElement {
  const info = FEATURE_GROUP_INFO[group];
  const headingId = `feature-group-${group}`;
  return (
    <section className={`feature-group feature-group--${group}`} aria-labelledby={headingId}>
      <div className="feature-group__head">
        <span className="feature-group__icon" aria-hidden="true">
          <Icon name={info.icon} />
        </span>
        <h3 id={headingId} className="feature-group__title">
          {info.title}
        </h3>
        <p className="feature-group__line">{info.line}</p>
      </div>
      <ul className="plain-list feature-group__tiles" role="list">
        {featuresInGroup(group).map((feature) => (
          <FeatureTile key={feature.id} feature={feature} />
        ))}
      </ul>
    </section>
  );
}
