/**
 * Expected plan facts, built by the same engine the browser runs.
 *
 * Responsibility: the plan a built-in sample gives on the pinned day, and the few items the
 * specs look for in it — a risk, a permission, an access item, a date note, and the rule and source behind
 * a "Why this?" — so a spec asserts the exact decision instead of a loose word that a panel's
 * fixed copy may also contain. Boundary: derivation only; the specs pin the browser to the
 * same day (helpers.pinToday) and own every assertion.
 */
import {
  type AccessItemId,
  type PermissionId,
  type SampleId,
  sampleContext,
} from '@intezaam/core/domain';
import { buildPlan } from '@intezaam/core/engine';
import type {
  AccessibilityPlan,
  DateNote,
  DateNoteKind,
  Permission,
  Plan,
  Risk,
  SourceRef,
  TraceItem,
} from '@intezaam/core/schemas';
import { PINNED_TODAY_ISO } from './fixtures';

/** The id core's blocker probe gives "outdoor amplified music after 10 pm" (engine/risk-probes.ts). */
export const NIGHT_SOUND_RISK_ID = 'risk-night-sound';

/** One "Why this?" rule and the first source it cites. */
export interface CitedRule {
  readonly rule: TraceItem;
  readonly source: SourceRef;
}

type AccessItem = AccessibilityPlan['items'][number];

/** A missing item means the sample no longer makes that decision: say so, not a locator timeout. */
function found<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`The expected plan has no ${what}`);
  return value;
}

/**
 * The plan a built-in sample gives on the pinned day — the same `buildPlan` the browser runs.
 * @example
 * expectedPlan('jaipur-wedding').risks[0]?.severity; // 'blocker'
 */
export function expectedPlan(id: SampleId): Plan {
  const built = buildPlan(sampleContext(id, PINNED_TODAY_ISO), PINNED_TODAY_ISO);
  if (!built.ok) throw new Error(`Sample ${id} did not plan: ${built.error.message}`);
  return built.value;
}

/**
 * One risk of a plan, by id.
 * @example
 * riskIn(expectedPlan('jaipur-wedding'), NIGHT_SOUND_RISK_ID).severity; // 'blocker'
 */
export function riskIn(plan: Plan, id: string): Risk {
  return found(
    plan.risks.find((risk) => risk.id === id),
    `risk ${id}`,
  );
}

/**
 * One permission on a plan's checklist, by id.
 * @example
 * permissionIn(expectedPlan('society-ganesh'), 'procession').required; // true
 */
export function permissionIn(plan: Plan, id: PermissionId): Permission {
  return found(
    plan.permissions.find((permission) => permission.id === id),
    `permission ${id}`,
  );
}

/**
 * One item of a plan's accessibility and elders plan, by id.
 * @example
 * accessItemIn(expectedPlan('chennai-60th'), 'elder-seating').title; // 'Reserved seating for elders'
 */
export function accessItemIn(plan: Plan, id: AccessItemId): AccessItem {
  return found(
    plan.accessibility.items.find((item) => item.id === id),
    `access item ${id}`,
  );
}

/**
 * The first date note of a kind on a plan's timeline.
 * @example
 * dateNoteIn(expectedPlan('jaipur-wedding'), 'muhurat').ruleId; // 'DATE-02'
 */
export function dateNoteIn(plan: Plan, kind: DateNoteKind): DateNote {
  return found(
    plan.timeline.dateNotes.find((note) => note.kind === kind),
    `${kind} date note`,
  );
}

/**
 * The first rule behind a set of trace ids (in the order cited, as "Why this?" lists them)
 * that cites a source, with that source — what the open disclosure must show.
 * @example
 * citedRuleFor(plan, riskIn(plan, NIGHT_SOUND_RISK_ID).traceIds).rule.ruleId; // 'PERM-02'
 */
export function citedRuleFor(plan: Plan, traceIds: readonly string[]): CitedRule {
  const rule = found(
    traceIds
      .flatMap((id) => plan.trace.filter((item) => item.id === id))
      .find((item) => item.sourceIds.length > 0),
    `cited rule among ${traceIds.join(', ')}`,
  );
  const source = found(
    plan.sources.find((ref) => rule.sourceIds.includes(ref.id)),
    `source for ${rule.ruleId}`,
  );
  return { rule, source };
}
