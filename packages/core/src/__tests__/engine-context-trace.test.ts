/**
 * Tests for engine/context-trace.ts — one "Why this?" item per classifier (CTX-01…08).
 *
 * Responsibility: prove each classifier writes exactly one item, that the tier item explains
 * the override, the unknown city and the anchor, and that grades follow the gazetteer.
 * Boundary: unit tests over classified contexts.
 */
import { describe, expect, it } from 'vitest';
import { traceContext } from '../engine/context-trace.js';
import { createTraceLog } from '../engine/trace.js';
import type { EventContext } from '../schemas/context.js';
import {
  birthday,
  classified,
  community,
  homePuja,
  inDays,
  undated,
  wedding,
} from './fixtures/engine-contexts.js';

function itemsFor(context: EventContext): ReturnType<ReturnType<typeof createTraceLog>['items']> {
  const trace = createTraceLog();
  traceContext(classified(context), trace);
  return trace.items();
}

function effectOf(context: EventContext, ruleId: string): string {
  return itemsFor(context).find((item) => item.ruleId === ruleId)?.effect ?? '';
}

describe('traceContext', () => {
  it('writes one item for each of CTX-01…08 and returns their ids', () => {
    const trace = createTraceLog();
    const ids = traceContext(classified(wedding()), trace);
    expect(trace.items().map((item) => item.ruleId)).toEqual([
      'CTX-01',
      'CTX-02',
      'CTX-03',
      'CTX-04',
      'CTX-05',
      'CTX-06',
      'CTX-07',
      'CTX-08',
    ]);
    expect(Object.values(ids)).toEqual(trace.items().map((item) => item.id));
  });

  it('explains the anchor, the override and an unknown city', () => {
    expect(effectOf(wedding(), 'CTX-02')).toContain('published wedding figure');
    expect(effectOf(wedding({ tier: 'metro' }), 'CTX-02')).toContain('You set the price tier');
    expect(effectOf(wedding({ city: 'Atlantis' }), 'CTX-02')).toContain('not in our city list');
    expect(effectOf(wedding({ city: 'Pune' }), 'CTX-02')).toBe('Pune is priced as a tier-2 city.');
  });

  it('grades the tier by the gazetteer, and an unknown city as an assumption', () => {
    const pune = itemsFor(wedding({ city: 'Pune' })).find((item) => item.ruleId === 'CTX-02');
    const lost = itemsFor(wedding({ city: 'Atlantis' })).find((item) => item.ruleId === 'CTX-02');
    expect(pune?.confidence).toBe('C');
    expect(lost?.assumption).toBe(true);
  });

  it('describes the season, lead time and calendar for each date mode', () => {
    expect(effectOf(undated(wedding()), 'CTX-04')).toBe('No date yet, so no season applies.');
    expect(effectOf(undated(wedding()), 'CTX-05')).toBe('The date is not fixed yet.');
    expect(effectOf(wedding({ dateIso: inDays(-3) }), 'CTX-05')).toContain('already passed');
    expect(effectOf(wedding({ dateIso: '2026-11-25' }), 'CTX-04')).toContain('peak');
    expect(effectOf(wedding({ dateIso: '2027-03-06' }), 'CTX-04')).toBe(
      'A regular-season weekend date.',
    );
    expect(effectOf(wedding(), 'CTX-08')).toContain('apply');
    expect(effectOf(wedding({ tradition: 'christian' }), 'CTX-08')).toContain('do not apply');
    expect(effectOf(homePuja(), 'CTX-08')).toContain('No tradition given');
  });

  it('describes each crowd class and rain risk', () => {
    expect(effectOf(birthday(), 'CTX-06')).toContain('Up to 200');
    expect(effectOf(wedding(), 'CTX-06')).toContain('Over 200');
    expect(effectOf(wedding({ guests: 800 }), 'CTX-06')).toContain('Over 500');
    expect(effectOf(community(), 'CTX-06')).toContain('Over 1,000');
    expect(effectOf(birthday(), 'CTX-07')).toContain('plan cover');
    expect(effectOf(homePuja(), 'CTX-07')).toContain('No rain risk');
  });
});
