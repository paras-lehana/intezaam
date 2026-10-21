/**
 * Shared fixtures for the People, Ideas, Safety, Share, What-if and Ask tests.
 *
 * Responsibility: panel props DERIVED from the code under test — a sample context from
 * core's `sampleContext`, its plan from `buildPlan`, a narration from the server's offline
 * twin with code-attached cost bands — and small builders for API replies that pass the
 * client's schemas. Boundary: test-only; tests pin only the inputs they own.
 */
import { vi, type Mock } from 'vitest';
import {
  askOffline,
  enforceIdeaConstraints,
  ideaConstraintsFor,
  narrateOffline,
} from '@intezaam/core';
import { type SampleId, sampleContext } from '@intezaam/core/domain';
import { buildPlan } from '@intezaam/core/engine';
import {
  type AskResponse,
  type ContextPatch,
  type DraftResponse,
  type EventContext,
  type Narration,
  type Plan,
  type Provenance,
  askResponseSchema,
  draftResponseSchema,
} from '@intezaam/core/schemas';
import type { PanelProps } from '../../components/features/panel-props';
import { TEST_TODAY_ISO } from '../helpers';

export interface SamplePanel {
  readonly context: EventContext;
  readonly plan: Plan;
  readonly onApplyPatch: Mock<(patch: ContextPatch) => void>;
  readonly props: PanelProps;
}

/**
 * A plan for a context, built by the engine under test.
 * @example
 * planFor(sampleContext('jaipur-wedding', TEST_TODAY_ISO)).title;
 */
export function planFor(context: EventContext): Plan {
  const built = buildPlan(context, TEST_TODAY_ISO);
  if (!built.ok) throw new Error(built.error.message);
  return built.value;
}

/**
 * Panel props for one of core's four samples.
 * @example
 * const { props, plan } = samplePanel('society-ganesh');
 */
export function samplePanel(id: SampleId, extra: Partial<PanelProps> = {}): SamplePanel {
  const context = sampleContext(id, TEST_TODAY_ISO);
  const plan = planFor(context);
  const onApplyPatch = vi.fn<(patch: ContextPatch) => void>();
  return {
    context,
    plan,
    onApplyPatch,
    props: {
      plan,
      context,
      todayIso: TEST_TODAY_ISO,
      onApplyPatch,
      narrationState: 'idle',
      ...extra,
    },
  };
}

/**
 * The society Ganesh sample, checked to be a community event with community details so the
 * community-toolkit tests can read them without optional chaining on the setup itself.
 * @example
 * communityPanel().context.community?.households; // the sample's own household count
 */
export function communityPanel(): SamplePanel {
  const setup = samplePanel('society-ganesh');
  if (setup.plan.community === undefined || setup.context.community === undefined) {
    throw new Error('the society sample is a community event with community details');
  }
  return setup;
}

/**
 * The narration the server returns when no model answers: the offline twin, with the code
 * guard attaching cost bands and YouTube links.
 * @example
 * offlineNarration(plan, context).ideas.length > 0; // true
 */
export function offlineNarration(plan: Plan, context: EventContext): Narration {
  const model = narrateOffline(plan, context);
  const { ideas } = enforceIdeaConstraints(model.ideas, ideaConstraintsFor(plan, context));
  return { ...model, ideas };
}

/** A provenance that passes the client's schema (the tests own these values). */
export const GEMINI_PROVENANCE: Provenance = {
  mode: 'gemini',
  models: ['gemini-3.5-flash-lite'],
  latencyMs: 900,
  steps: [],
};

/** A provenance for answers the offline planner gave (the tests own these values). */
export const OFFLINE_PROVENANCE: Provenance = {
  mode: 'offline',
  models: [],
  latencyMs: 4,
  steps: [],
  reason: 'daily_quota',
};

/**
 * The /api/ask reply the server sends when its rules answer: core's offline twin for this
 * question and plan, plus provenance.
 * @example
 * askReply('add 50 guests', samplePanel('jaipur-wedding')).patch?.ops[0]?.op; // 'setGuests'
 */
export function askReply(
  question: string,
  setup: SamplePanel,
  provenance = OFFLINE_PROVENANCE,
): AskResponse {
  const output = askOffline(question, setup.plan, setup.context, TEST_TODAY_ISO);
  return askResponseSchema.parse({ ...output, provenance });
}

/**
 * A /api/drafts reply carrying a test-owned message.
 * @example
 * draftReply('Namaste!').body; // 'Namaste!'
 */
export function draftReply(body: string, subject?: string): DraftResponse {
  return draftResponseSchema.parse({
    ...(subject === undefined ? {} : { subject }),
    body,
    whatsappUrl: 'https://wa.me/?text=ignored',
    provenance: GEMINI_PROVENANCE,
  });
}

/**
 * The same event with its date not fixed yet (dateIso left out, as exactOptionalPropertyTypes wants).
 * @example
 * undated(context).dateFlexible; // true
 */
export function undated(context: EventContext): EventContext {
  const { dateIso: _dateIso, ...rest } = context;
  return { ...rest, dateFlexible: true };
}

export interface CapturedDownload {
  readonly fileName: string;
  readonly text: () => Promise<string>;
}

export interface DownloadCapture {
  readonly files: CapturedDownload[];
  /** Object URLs released after each click (none may leak). */
  readonly revoked: string[];
}

/** The object URL the stubbed `URL.createObjectURL` hands out. */
export const TEST_OBJECT_URL = 'blob:test-download';

/**
 * Captures browser downloads: the Blob handed to `URL.createObjectURL` and the link's name.
 * @example
 * const downloads = captureDownloads();
 * await user.click(button);
 * downloads.files[0]?.fileName; // 'jaipur-wedding-budget.csv'
 */
export function captureDownloads(): DownloadCapture {
  const capture: DownloadCapture = { files: [], revoked: [] };
  let latest: Blob | undefined;
  // A URL class whose object-URL statics record the Blob; setup.ts unstubs it after each test.
  class RecordingUrl extends URL {
    static override createObjectURL(source: Blob | MediaSource): string {
      if (source instanceof Blob) latest = source;
      return TEST_OBJECT_URL;
    }

    static override revokeObjectURL(url: string): void {
      capture.revoked.push(url);
    }
  }
  vi.stubGlobal('URL', RecordingUrl);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function record(
    this: HTMLAnchorElement,
  ) {
    const blob = latest;
    if (blob !== undefined)
      capture.files.push({ fileName: this.download, text: () => blob.text() });
  });
  return capture;
}
