/**
 * Responsibility: the home page — the hero (one h1, two calls to action, trust points, Hindi
 * marked up) and the bento: all 42 features listed once, under their seven groups, each
 * linking to where it lives. Boundary: tile copy is read from the feature data, never retyped
 * here.
 */
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BENTO_HEADING } from '../../components/home/FeatureBento';
import {
  FEATURE_GROUP_INFO,
  FEATURE_GROUPS,
  featureHref,
} from '../../components/home/feature-types';
import { FEATURES, featuresInGroup } from '../../components/home/features';
import { TRUST_POINTS } from '../../components/home/Hero';
import { HomePage } from '../../pages/HomePage';
import { renderAt } from '../helpers';

/** The product's feature list has 42 numbered rows. */
const FEATURE_COUNT = 42;

describe('Home hero', () => {
  it('opens with the promise as the only h1', () => {
    renderAt(<HomePage />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveAccessibleName('Every arrangement, one plan.');
  });

  it('offers the two calls to action and the trust points', () => {
    renderAt(<HomePage />);
    const hero = screen.getByRole('region', { name: 'Every arrangement, one plan.' });
    expect(within(hero).getByRole('link', { name: 'Start planning' })).toHaveAttribute(
      'href',
      '/plan',
    );
    expect(within(hero).getByRole('link', { name: 'See how it works' })).toHaveAttribute(
      'href',
      '/about',
    );
    const trust = screen.getByRole('list', { name: 'Why you can rely on it' });
    expect(
      within(trust)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(TRUST_POINTS.map((point) => `✦${point}`));
  });

  it('marks the Devanagari wordmark with lang hi', () => {
    renderAt(<HomePage />);
    expect(screen.getAllByText('इंतज़ाम')[0]).toHaveAttribute('lang', 'hi');
  });
});

describe('Feature bento', () => {
  it('numbers every feature of the list exactly once', () => {
    const ids = FEATURES.map((feature) => feature.id).sort((a, b) => a - b);
    expect(ids).toEqual(Array.from({ length: FEATURE_COUNT }, (_, index) => index + 1));
  });

  it('lists every feature as a link to the place that does it', () => {
    renderAt(<HomePage />);
    const bento = screen.getByRole('region', { name: BENTO_HEADING });
    for (const feature of FEATURES) {
      expect(within(bento).getByRole('link', { name: feature.title })).toHaveAttribute(
        'href',
        featureHref(feature.target),
      );
    }
    expect(within(bento).getAllByRole('heading', { level: 4 })).toHaveLength(FEATURES.length);
  });

  it('groups the tiles under the seven groups, in order', () => {
    renderAt(<HomePage />);
    const bento = screen.getByRole('region', { name: BENTO_HEADING });
    expect(
      within(bento)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(FEATURE_GROUPS.map((group) => FEATURE_GROUP_INFO[group].title));
    for (const group of FEATURE_GROUPS) {
      const region = within(bento).getByRole('region', { name: FEATURE_GROUP_INFO[group].title });
      expect(within(region).getAllByRole('listitem')).toHaveLength(featuresInGroup(group).length);
    }
  });

  it('links plan features to /plan anchors and the sources tile to About', () => {
    expect(featureHref('money')).toBe('/plan#money');
    expect(featureHref('sources')).toBe('/about#sources');
  });
});
