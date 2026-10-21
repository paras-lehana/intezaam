/**
 * Trace log — the "Why this?" record every rule writes as it decides.
 *
 * Responsibility: collect TraceItems with stable, readable ids (`VER-M.1`), the signals each
 * rule read, its effect, the sources it cites and its grade (grade D = assumption), and
 * build the deduplicated source list the plan publishes. Boundary: bookkeeping only; the
 * rule families decide what to record.
 */
import { clipText } from '../format.js';
import type { RuleId } from '../domain/rule-ids.js';
import { RULES } from '../domain/rules.js';
import { isSourceId, type SourceId, sourceRef } from '../domain/sources.js';
import type { Confidence } from '../domain/source-types.js';
import {
  MAX_LABEL_CHARS,
  MAX_LINE_CHARS,
  MAX_TRACE_INPUTS,
  MAX_TRACE_ITEMS,
  MAX_TRACE_SOURCES,
} from '../schemas/limits.js';
import type { SourceRef, TraceItem } from '../schemas/trace.js';

/** A trace input is shown as text; these caps match the schema's key and value lengths. */
const MAX_INPUT_VALUE_CHARS = 120;
const MAX_INPUT_KEY_CHARS = 40;

/** Grade D marks our own assumption; the UI labels those items. */
const ASSUMPTION_GRADE: Confidence = 'D';

export type TraceValue = string | number | boolean;

export interface TraceSpec {
  readonly ruleId: RuleId;
  /** The context signals the rule read, in display order. */
  readonly inputs: readonly (readonly [string, TraceValue])[];
  /** What the rule did, in one plain sentence. */
  readonly effect: string;
  /** Defaults to the rule's documented sources. */
  readonly sourceIds?: readonly SourceId[];
  /** Defaults to the rule's documented grade. */
  readonly confidence?: Confidence;
}

export interface TraceLog {
  /** Records a decision; a repeated `key` returns the first item's id instead of a duplicate. */
  add(spec: TraceSpec, key?: string): string;
  /** A generic item for a rule (its documented summary), recorded once per rule. */
  rule(ruleId: RuleId): string;
  items(): TraceItem[];
}

function displayValue(value: TraceValue): string {
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return clipText(String(value), MAX_INPUT_VALUE_CHARS);
}

function toItem(id: string, spec: TraceSpec): TraceItem {
  const rule = RULES[spec.ruleId];
  const confidence = spec.confidence ?? rule.confidence;
  return {
    id,
    ruleId: spec.ruleId,
    title: clipText(rule.title, MAX_LABEL_CHARS),
    inputs: spec.inputs.slice(0, MAX_TRACE_INPUTS).map(([key, value]) => ({
      key: clipText(key, MAX_INPUT_KEY_CHARS),
      value: displayValue(value),
    })),
    effect: clipText(spec.effect, MAX_LINE_CHARS),
    sourceIds: [...new Set(spec.sourceIds ?? rule.sourceIds)].slice(0, MAX_TRACE_SOURCES),
    confidence,
    assumption: confidence === ASSUMPTION_GRADE,
  };
}

/**
 * Creates an empty trace log for one plan build.
 * @example
 * const trace = createTraceLog();
 * trace.add({ ruleId: 'CTX-03', inputs: [['guests', 300]], effect: 'Mid-size.' }); // 'CTX-03.1'
 */
export function createTraceLog(): TraceLog {
  const items: TraceItem[] = [];
  const byKey = new Map<string, string>();
  const perRule = new Map<RuleId, number>();
  let firstId = '';

  function add(spec: TraceSpec, key?: string): string {
    const known = key === undefined ? undefined : byKey.get(key);
    if (known !== undefined) return known;
    // A full log stops growing (the schema caps it); later decisions cite an existing item.
    if (items.length >= MAX_TRACE_ITEMS) {
      return items.find((item) => item.ruleId === spec.ruleId)?.id ?? firstId;
    }
    const count = (perRule.get(spec.ruleId) ?? 0) + 1;
    perRule.set(spec.ruleId, count);
    const id = `${spec.ruleId}.${count}`;
    if (items.length === 0) firstId = id;
    items.push(toItem(id, spec));
    if (key !== undefined) byKey.set(key, id);
    return id;
  }

  return {
    add,
    rule: (ruleId) => add({ ruleId, inputs: [], effect: RULES[ruleId].summary }, `rule:${ruleId}`),
    items: () => [...items],
  };
}

/**
 * Every registered source cited anywhere in the plan, once each, in first-cited order.
 * @example
 * collectSources([['S-VK-2026', 'S-NDMA-2014'], ['S-VK-2026']]).length; // 2
 */
export function collectSources(groups: readonly (readonly string[])[]): SourceRef[] {
  const ids = new Set(groups.flat().filter(isSourceId));
  return [...ids].map((id) => sourceRef(id));
}
