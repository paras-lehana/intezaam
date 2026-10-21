/**
 * About page: how Intezaam works, the GenAI pipeline, Google services, method and sources,
 * and the assumptions behind every plan.
 *
 * Responsibility: explain the loop and the trust model in plain language. Boundary: the
 * Google services list is fetched live from the server's catalog and the sources come from
 * core's register, so neither can drift from what the app actually uses.
 */
import type { ReactElement } from 'react';
import { AssumptionsList } from '../components/about/AssumptionsList';
import { DecisionLoop } from '../components/about/DecisionLoop';
import { GoogleServices } from '../components/about/GoogleServices';
import { PipelineDiagram } from '../components/about/PipelineDiagram';
import { SourcesRegister } from '../components/about/SourcesRegister';
import { PageHero } from '../components/ui/PageHero';
import { CANONICAL_PATHS, useCanonical } from '../lib/use-canonical';
import { usePageTitle } from '../lib/use-page-title';
import '../styles/about.css';

export const ABOUT_TITLE = 'How Intezaam works';

export function AboutPage(): ReactElement {
  usePageTitle('How it works');
  useCanonical(CANONICAL_PATHS.about);
  return (
    <div className="container about">
      <PageHero eyebrow="How it works" title={ABOUT_TITLE}>
        <span lang="hi">इंतज़ाम</span> (intezaam) means “arrangements”. You describe the
        celebration; tested rules make the decisions and show why; Gemini reads your words and
        writes the explanations, ideas and messages.
      </PageHero>
      <DecisionLoop />
      <PipelineDiagram />
      <GoogleServices />
      <SourcesRegister />
      <AssumptionsList />
    </div>
  );
}
