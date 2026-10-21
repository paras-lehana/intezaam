/**
 * Tests for schemas/provenance.ts: the provenance badge contract.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { ENGINE_MODES, provenanceSchema } from '../schemas/provenance.js';

describe('provenance', () => {
  it('names the engine, models and timings', () => {
    expect([...ENGINE_MODES]).toEqual(['gemini', 'offline']);
    const provenance = {
      mode: 'gemini',
      models: ['gemini-3.5-flash-lite'],
      latencyMs: 2950,
      steps: [{ name: 'narrate', engine: 'gemini-3.5-flash-lite', ms: 2900 }],
    };
    expect(provenanceSchema.safeParse(provenance).success).toBe(true);
    expect(provenanceSchema.safeParse({ ...provenance, mode: 'magic' }).success).toBe(false);
    expect(provenanceSchema.safeParse({ ...provenance, latencyMs: -1 }).success).toBe(false);
  });
});
