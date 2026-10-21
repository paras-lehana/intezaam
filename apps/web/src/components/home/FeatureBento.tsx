/**
 * "Everything Intezaam does": every feature, grouped, each linking to where it lives.
 *
 * Responsibility: show the whole product before asking for anything — 42 features under
 * the brief's four nouns plus Assistant, Community and Share. Boundary: static copy from
 * features.ts; the count in the heading is computed, never typed.
 */
import type { ReactElement } from 'react';
import { Hairline } from '../ui/Hairline';
import { FEATURE_GROUPS } from './feature-types';
import { FeatureGroup } from './FeatureGroup';
import { FEATURES } from './features';

export const BENTO_HEADING = `All ${FEATURES.length} features, in ${FEATURE_GROUPS.length} groups`;

export function FeatureBento(): ReactElement {
  return (
    <section className="bento section" aria-labelledby="features-heading">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">What you get</p>
          <h2 id="features-heading">{BENTO_HEADING}</h2>
          <p className="lede">
            One plan, organised into tabs. Every tile opens the place that does it, and every number
            inside shows the rule and the source behind it.
          </p>
        </div>
        <Hairline />
        <div className="bento__groups">
          {FEATURE_GROUPS.map((group) => (
            <FeatureGroup key={group} group={group} />
          ))}
        </div>
      </div>
    </section>
  );
}
