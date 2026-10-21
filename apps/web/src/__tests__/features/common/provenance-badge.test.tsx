/**
 * Responsibility: the provenance badge is honest in every state — "Asking Gemini" while it
 * waits, model and seconds when Gemini answered ("saved answer" on a cache hit), "Offline planner" (with the server's reason
 * when it gave one) otherwise. Boundary: provenance objects pass core's schema; expected
 * words come from the component's own tables.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  CACHE_ENGINE,
  OFFLINE_REASONS,
  type Provenance,
  provenanceSchema,
} from '@intezaam/core/schemas';
import {
  ASKING_GEMINI,
  OFFLINE_PLANNER,
  OFFLINE_REASON_TEXT,
  ProvenanceBadge,
  provenanceText,
  SAVED_ANSWER,
} from '../../../components/features/common/ProvenanceBadge';
import { formatSeconds } from '../../../lib/format';
import {
  GEMINI_PROVENANCE,
  OFFLINE_PROVENANCE,
  TEST_LATENCY_MS,
  TEST_MODEL,
} from '../plan-fixtures';

describe('provenanceText', () => {
  it('names the model and the seconds when Gemini answered', () => {
    expect(provenanceText('ready', GEMINI_PROVENANCE)).toBe(
      `Explained by Gemini · ${TEST_MODEL} · ${formatSeconds(TEST_LATENCY_MS)}`,
    );
  });

  it('says "saved answer" instead of the seconds when the server cache answered', () => {
    const cached: Provenance = provenanceSchema.parse({
      ...GEMINI_PROVENANCE,
      latencyMs: 0,
      steps: [{ name: 'cache-hit', engine: CACHE_ENGINE, ms: 0 }],
    });
    expect(provenanceText('ready', cached)).toBe(
      `Explained by Gemini · ${TEST_MODEL} · ${SAVED_ANSWER}`,
    );
  });

  it('says so while the narration is on its way', () => {
    expect(provenanceText('loading', GEMINI_PROVENANCE)).toBe(ASKING_GEMINI);
  });

  it.each(['idle', 'offline'] as const)('says "Offline planner" when %s', (state) => {
    expect(provenanceText(state, GEMINI_PROVENANCE)).toBe(OFFLINE_PLANNER);
  });

  it('says "Offline planner" when the offline twin answered', () => {
    expect(provenanceText('ready', OFFLINE_PROVENANCE)).toBe(OFFLINE_PLANNER);
    expect(provenanceText('ready')).toBe(OFFLINE_PLANNER);
  });

  it.each(OFFLINE_REASONS)('gives the reason the server named: %s', (reason) => {
    const provenance: Provenance = provenanceSchema.parse({ ...OFFLINE_PROVENANCE, reason });
    expect(provenanceText('ready', provenance)).toBe(
      `${OFFLINE_PLANNER} · ${OFFLINE_REASON_TEXT[reason]}`,
    );
  });
});

describe('ProvenanceBadge', () => {
  it('renders the text with a decorative mark', () => {
    render(<ProvenanceBadge state="ready" provenance={GEMINI_PROVENANCE} />);
    const text = provenanceText('ready', GEMINI_PROVENANCE);
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.getByText('✦')).toHaveAttribute('aria-hidden', 'true');
  });

  it('marks the offline planner with a different shape', () => {
    render(<ProvenanceBadge state="offline" />);
    expect(screen.getByText(OFFLINE_PLANNER)).toBeInTheDocument();
    expect(screen.getByText('⚙')).toHaveAttribute('aria-hidden', 'true');
  });
});
