/**
 * Responsibility: the About page — the loop and pipeline as ordered steps, the Google services
 * catalog from a stubbed API (implemented first, failures said in words), the sources register
 * grouped by grade with counts from core, and the assumptions list. Boundary: the catalog
 * fixture is test-owned and parsed through the core schema; counts are derived from
 * listSources().
 */
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CONFIDENCE_GRADES, CONFIDENCE_LABELS, listSources } from '@intezaam/core/domain';
import { googleServicesResponseSchema } from '@intezaam/core/schemas';
import { ASSUMPTIONS } from '../../components/about/AssumptionsList';
import { LOOP_STEPS } from '../../components/about/DecisionLoop';
import { PIPELINE_STAGES } from '../../components/about/PipelineDiagram';
import { ABOUT_TITLE, AboutPage } from '../../pages/AboutPage';
import { HTTP_SERVER_ERROR, jsonResponse, renderAt, stubFetch } from '../helpers';

/** A catalog this test owns: one implemented and one declined service. */
const CATALOG = googleServicesResponseSchema.parse({
  services: [
    {
      id: 'gemini',
      name: 'Gemini API',
      status: 'implemented',
      purpose: 'Reads briefs and writes explanations.',
      codePaths: ['apps/server/src/services/genai-client.ts'],
      envVars: ['LLM_MODELS'],
    },
    {
      id: 'maps-embed',
      name: 'Maps Embed API',
      status: 'declined',
      purpose: 'Needs a key and a billing account.',
      codePaths: [],
      envVars: [],
    },
  ],
});

describe('About page', () => {
  it('explains the loop and the pipeline as ordered steps', () => {
    stubFetch(jsonResponse(CATALOG));
    renderAt(<AboutPage />, '/about');
    expect(screen.getByRole('heading', { level: 1, name: ABOUT_TITLE })).toBeInTheDocument();
    for (const step of LOOP_STEPS) {
      expect(screen.getByRole('heading', { level: 3, name: step.name })).toBeInTheDocument();
    }
    for (const stage of PIPELINE_STAGES) {
      expect(screen.getByRole('heading', { level: 3, name: stage.name })).toBeInTheDocument();
    }
  });

  it('renders the Google services catalog from the API, implemented first', async () => {
    const fetchMock = stubFetch(jsonResponse(CATALOG));
    renderAt(<AboutPage />, '/about');
    const section = screen.getByRole('region', { name: 'Google services' });
    const names = await within(section).findAllByRole('heading', { level: 3 });
    expect(names.map((name) => name.textContent)).toEqual(['Gemini API', 'Maps Embed API']);
    expect(within(section).getByText('Implemented')).toBeInTheDocument();
    expect(within(section).getByText('Declined')).toBeInTheDocument();
    expect(within(section).getByText('LLM_MODELS')).toBeInTheDocument();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/google/services');
  });

  it('says so when the catalog cannot be loaded', async () => {
    stubFetch(jsonResponse({ error: { code: 'internal', message: 'x' } }, HTTP_SERVER_ERROR));
    renderAt(<AboutPage />, '/about');
    expect(await screen.findByText(/could not be loaded/)).toBeInTheDocument();
  });

  it('groups the sources register by confidence grade with counts from core', () => {
    stubFetch(jsonResponse(CATALOG));
    renderAt(<AboutPage />, '/about');
    const sources = screen.getByRole('region', { name: 'Method and sources' });
    expect(sources).toHaveAttribute('id', 'sources');
    const all = listSources();
    for (const grade of CONFIDENCE_GRADES) {
      const count = all.filter((source) => source.confidence === grade).length;
      const summary = within(sources).getByText(`Grade ${grade}`).closest('summary');
      expect(summary).toHaveTextContent(CONFIDENCE_LABELS[grade]);
      expect(summary).toHaveTextContent(`${count} ${count === 1 ? 'source' : 'sources'}`);
    }
    expect(within(sources).getAllByRole('link')).toHaveLength(all.length);
  });

  it('lists every assumption', () => {
    stubFetch(jsonResponse(CATALOG));
    renderAt(<AboutPage />, '/about');
    const section = screen.getByRole('region', { name: 'Assumptions we made' });
    expect(within(section).getAllByRole('listitem')).toHaveLength(ASSUMPTIONS.length);
  });
});
