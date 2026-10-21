/**
 * Plan fixtures for the workspace tests, derived from the engine — never typed by hand.
 *
 * Responsibility: build each persona's plan with core `buildPlan(sampleContext(…))` for the
 * fixed test day, assemble the props every panel takes, and make narration, provenance and
 * API responses whose ids come from that same plan. Boundary: test-only; the only pinned
 * values are the ones a test owns (a model name, a latency, a headline).
 */
import { vi } from 'vitest';
import { readBriefOffline, validateBriefDraft } from '@intezaam/core';
import { type SampleId, sampleContext } from '@intezaam/core/domain';
import { buildPlan } from '@intezaam/core/engine';
import {
  type BriefResponse,
  type EventContext,
  type Narration,
  type NarrationResponse,
  type Plan,
  type Provenance,
  briefResponseSchema,
  narrationResponseSchema,
  narrationSchema,
  provenanceSchema,
} from '@intezaam/core/schemas';
import type { PanelProps } from '../../components/features/panel-props';
import { TEST_TODAY_ISO } from '../helpers';

export interface SampleFixture {
  readonly context: EventContext;
  readonly plan: Plan;
}

/**
 * A persona's context and the plan the engine makes of it on the test day.
 * @example
 * const { plan } = samplePlan('jaipur-wedding');
 */
export function samplePlan(id: SampleId): SampleFixture {
  const context = sampleContext(id, TEST_TODAY_ISO);
  const built = buildPlan(context, TEST_TODAY_ISO);
  if (!built.ok) throw new Error(`fixture ${id} did not plan: ${built.error.message}`);
  return { context, plan: built.value };
}

/**
 * Props for any panel, with a spy for applied changes.
 * @example
 * render(<MoneyPanel {...panelProps('jaipur-wedding')} />);
 */
export function panelProps(id: SampleId, overrides: Partial<PanelProps> = {}): PanelProps {
  const { context, plan } = samplePlan(id);
  return {
    plan,
    context,
    todayIso: TEST_TODAY_ISO,
    onApplyPatch: vi.fn(),
    narrationState: 'idle',
    ...overrides,
  };
}

/** The model a narrated response names (a test-owned value). */
export const TEST_MODEL = 'gemini-3.5-flash-lite';
/** The latency a narrated response reports (a test-owned value). */
export const TEST_LATENCY_MS = 900;

export const GEMINI_PROVENANCE: Provenance = provenanceSchema.parse({
  mode: 'gemini',
  models: [TEST_MODEL],
  latencyMs: TEST_LATENCY_MS,
  steps: [],
});

export const OFFLINE_PROVENANCE: Provenance = provenanceSchema.parse({
  mode: 'offline',
  models: [],
  latencyMs: 0,
  steps: [],
});

/**
 * A narration that cites the plan's own first trace item and first task.
 * @example
 * narrationFor(plan).reasons[0]?.traceId; // plan.verdict.money.traceIds[0]
 */
export function narrationFor(plan: Plan): Narration {
  const traceId = plan.verdict.money.traceIds[0] ?? plan.trace[0]?.id ?? 'none';
  const taskId = plan.timeline.tasks[0]?.id ?? 'none';
  return narrationSchema.parse({
    headline: 'A workable plan with three things to settle first',
    summary: 'The budget covers the plan; book the venue and caterer this month.',
    reasons: [{ traceId, text: 'The budget sits inside the published range.' }],
    actions: [{ taskId, text: 'Shortlist venues this week.' }],
    ideas: [],
  });
}

/**
 * The /api/plan/narration reply for a plan: its narration and Gemini provenance, no plan.
 * @example
 * stubFetch(jsonResponse(narrationResponseFor(plan)));
 */
export function narrationResponseFor(plan: Plan): NarrationResponse {
  return narrationResponseSchema.parse({
    narration: narrationFor(plan),
    provenance: GEMINI_PROVENANCE,
  });
}

/**
 * The /api/brief reply when no model answers: core's offline reader, checked by the same
 * evidence guard the server runs, with offline provenance.
 * @example
 * briefResponseFor('Shaadi in Jaipur, 300 log').draft.city; // 'Jaipur'
 */
export function briefResponseFor(text: string): BriefResponse {
  const checked = validateBriefDraft(readBriefOffline(text, TEST_TODAY_ISO), text, TEST_TODAY_ISO);
  return briefResponseSchema.parse({
    draft: checked.draft,
    filled: checked.filled,
    missing: checked.missing,
    understood: checked.understood,
    provenance: OFFLINE_PROVENANCE,
  });
}
