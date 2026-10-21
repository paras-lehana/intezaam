/**
 * Tests for engine/trace.ts — trace ids, dedupe, the rule fallback, the size cap and sources.
 *
 * Responsibility: prove every trace item is schema-valid, ids are stable and readable,
 * grade D marks an assumption, the log never exceeds the schema cap, and the source list
 * keeps only registered ids once each. Boundary: unit tests; expected values come from RULES.
 */
import { describe, expect, it } from 'vitest';
import { RULES } from '../domain/rules.js';
import { collectSources, createTraceLog } from '../engine/trace.js';
import { MAX_TRACE_INPUTS, MAX_TRACE_ITEMS } from '../schemas/limits.js';
import { traceItemSchema } from '../schemas/trace.js';

describe('createTraceLog', () => {
  it('numbers items per rule and returns readable ids', () => {
    const trace = createTraceLog();
    const first = trace.add({ ruleId: 'CTX-03', inputs: [['guests', 300]], effect: 'Mid-size.' });
    const second = trace.add({ ruleId: 'CTX-03', inputs: [], effect: 'Again.' });
    const other = trace.add({ ruleId: 'BUD-09', inputs: [], effect: 'Exact.' });
    expect([first, second, other]).toEqual(['CTX-03.1', 'CTX-03.2', 'BUD-09.1']);
    expect(trace.items()).toHaveLength(3);
  });

  it('defaults title, sources and grade from the rule and marks grade D as an assumption', () => {
    const trace = createTraceLog();
    trace.add({
      ruleId: 'VEN-04',
      inputs: [
        ['flag', true],
        ['off', false],
      ],
      effect: 'Schedule.',
    });
    const [item] = trace.items();
    expect(item?.title).toBe(RULES['VEN-04'].title);
    expect(item?.sourceIds).toEqual([...RULES['VEN-04'].sourceIds]);
    expect(item?.confidence).toBe(RULES['VEN-04'].confidence);
    expect(item?.assumption).toBe(RULES['VEN-04'].confidence === 'D');
    expect(item?.inputs.map((input) => input.value)).toEqual(['yes', 'no']);
    expect(traceItemSchema.safeParse(item).success).toBe(true);
  });

  it('honours an explicit grade and source list and caps the inputs', () => {
    const trace = createTraceLog();
    const inputs = Array.from({ length: MAX_TRACE_INPUTS + 3 }, (_, i) => [`k${i}`, i] as const);
    trace.add({
      ruleId: 'PERM-02',
      inputs,
      effect: 'x',
      sourceIds: ['S-NDMA-2014'],
      confidence: 'D',
    });
    const [item] = trace.items();
    expect(item?.inputs).toHaveLength(MAX_TRACE_INPUTS);
    expect(item?.sourceIds).toEqual(['S-NDMA-2014']);
    expect(item?.assumption).toBe(true);
  });

  it('returns the first id for a repeated key and records rule() once', () => {
    const trace = createTraceLog();
    const a = trace.add({ ruleId: 'TL-01', inputs: [], effect: 'a' }, 'same');
    const b = trace.add({ ruleId: 'TL-01', inputs: [], effect: 'b' }, 'same');
    expect(b).toBe(a);
    expect(trace.rule('TL-09')).toBe(trace.rule('TL-09'));
    expect(trace.items().find((item) => item.ruleId === 'TL-09')?.effect).toBe(
      RULES['TL-09'].summary,
    );
  });

  it('stops growing at the schema cap and cites an existing item instead', () => {
    const trace = createTraceLog();
    for (let i = 0; i < MAX_TRACE_ITEMS; i += 1) {
      trace.add({ ruleId: 'RISK', inputs: [], effect: `risk ${i}` });
    }
    const sameRule = trace.add({ ruleId: 'RISK', inputs: [], effect: 'one more' });
    const newRule = trace.add({ ruleId: 'COM-01', inputs: [], effect: 'one more' });
    expect(trace.items()).toHaveLength(MAX_TRACE_ITEMS);
    expect(sameRule).toBe('RISK.1');
    expect(newRule).toBe('RISK.1');
  });

  it('returns a copy, so callers cannot change the log', () => {
    const trace = createTraceLog();
    trace.add({ ruleId: 'CTX-01', inputs: [], effect: 'x' });
    trace.items().pop();
    expect(trace.items()).toHaveLength(1);
  });
});

describe('collectSources', () => {
  it('keeps registered ids once each, in first-cited order', () => {
    const refs = collectSources([
      ['S-VK-2026', 'S-NDMA-2014'],
      ['S-VK-2026', 'S-NOT-REAL'],
    ]);
    expect(refs.map((ref) => ref.id)).toEqual(['S-VK-2026', 'S-NDMA-2014']);
  });

  it('returns an empty list for no citations', () => {
    expect(collectSources([])).toEqual([]);
  });
});
