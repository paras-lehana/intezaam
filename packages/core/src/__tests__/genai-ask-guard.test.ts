/**
 * Tests for the Ask guards (GenAI job 5): code-decided refusals and patch validation.
 *
 * Responsibility: refusals for booking or payment, legal advice and off-scope questions in
 * English, Hinglish and Hindi, and none for ordinary planning questions; applyAskPatch keeps
 * only valid, meaningful, in-range, deduplicated ops (capped), cleans a city name, and gives
 * nothing for junk. Boundary: contexts are the sample personas; limits come from the schema.
 */
import { describe, expect, it } from 'vitest';
import { FUNCTION_KINDS } from '../domain/functions.js';
import { functionAllowedFor } from '../domain/functions.js';
import { applyAskPatch, detectRefusal } from '../genai/ask-guard.js';
import { MAX_DAYS_AHEAD, MAX_GUESTS, MAX_PATCH_OPS } from '../schemas/limits.js';
import { inDays, planned, TODAY } from './fixtures/genai-plans.js';

describe('detectRefusal', () => {
  it('refuses booking and payment in three registers', () => {
    for (const question of [
      'Please book the caterer for me',
      'Pay the advance to the decorator',
      'caterer ko advance bhej do',
      'वेन्यू बुक कर दो',
      'Can you transfer money to the DJ?',
    ]) {
      expect(detectRefusal(question), question).toBe('booking-or-payment');
    }
  });

  it('refuses legal advice and off-scope questions', () => {
    expect(detectRefusal('Is it legal to burst crackers at midnight?')).toBe('legal-advice');
    expect(detectRefusal('police case ho jayega kya?')).toBe('legal-advice');
    expect(detectRefusal('What will the share price of my company be?')).toBe('off-scope');
    expect(detectRefusal('Match my kundli please')).toBe('off-scope');
  });

  it('answers ordinary planning questions', () => {
    for (const question of [
      'What is my catering budget?',
      'When should I book the photographer?',
      'When do I pay the advance?',
      'Book kab karna chahiye?',
      'Should we book the venue now?',
      'भुगतान कब करना है?',
      'kitne log aayenge?',
    ]) {
      expect(detectRefusal(question), question).toBeUndefined();
    }
  });
});

describe('applyAskPatch', () => {
  const { context } = planned('jaipur-wedding');

  it('keeps a valid change and drops one that changes nothing', () => {
    expect(
      applyAskPatch({ ops: [{ op: 'setGuests', value: context.guests + 50 }] }, context, TODAY),
    ).toEqual({
      ops: [{ op: 'setGuests', value: context.guests + 50 }],
    });
    expect(
      applyAskPatch({ ops: [{ op: 'setGuests', value: context.guests }] }, context, TODAY),
    ).toBeUndefined();
    expect(
      applyAskPatch(
        { ops: [{ op: 'setVenueSetting', value: context.venueSetting }] },
        context,
        TODAY,
      ),
    ).toBeUndefined();
    const { budgetInr: _unset, ...estimate } = context;
    expect(
      applyAskPatch({ ops: [{ op: 'setBudget', value: null }] }, estimate, TODAY),
    ).toBeUndefined();
    expect(
      applyAskPatch({ ops: [{ op: 'setBudget', value: 900_000 }] }, estimate, TODAY)?.ops,
    ).toHaveLength(1);
  });

  it('rejects out-of-range values, unknown ops and junk', () => {
    expect(
      applyAskPatch({ ops: [{ op: 'setGuests', value: MAX_GUESTS + 1 }] }, context, TODAY),
    ).toBeUndefined();
    expect(
      applyAskPatch({ ops: [{ op: 'bookVendor', value: 'caterer' }] }, context, TODAY),
    ).toBeUndefined();
    expect(applyAskPatch('add 50 guests', context, TODAY)).toBeUndefined();
    expect(applyAskPatch({ ops: 'all' }, context, TODAY)).toBeUndefined();
    expect(applyAskPatch(null, context, TODAY)).toBeUndefined();
  });

  it('accepts a date in the planning window only', () => {
    expect(
      applyAskPatch({ ops: [{ op: 'setDate', value: inDays(60) }] }, context, TODAY)?.ops,
    ).toHaveLength(1);
    expect(
      applyAskPatch({ ops: [{ op: 'setDate', value: inDays(-1) }] }, context, TODAY),
    ).toBeUndefined();
    expect(
      applyAskPatch(
        { ops: [{ op: 'setDate', value: inDays(MAX_DAYS_AHEAD + 1) }] },
        context,
        TODAY,
      ),
    ).toBeUndefined();
  });

  it('adds only functions the family can have and removes only ones it has', () => {
    const foreign = FUNCTION_KINDS.find((kind) => !functionAllowedFor(kind, context.family));
    const missing = FUNCTION_KINDS.find(
      (kind) => functionAllowedFor(kind, context.family) && !context.functions.includes(kind),
    );
    const [present] = context.functions;
    expect(foreign).toBeDefined();
    const patch = applyAskPatch(
      {
        ops: [
          { op: 'addFunction', value: foreign },
          { op: 'addFunction', value: missing },
          { op: 'removeFunction', value: present },
          { op: 'removeFunction', value: foreign },
        ],
      },
      context,
      TODAY,
    );
    expect(patch?.ops).toEqual([
      ...(missing === undefined ? [] : [{ op: 'addFunction', value: missing }]),
      ...(present === undefined ? [] : [{ op: 'removeFunction', value: present }]),
    ]);
  });

  it('cleans a city name, keeps toggles and priorities that are not the cut, dedupes and caps', () => {
    const patch = applyAskPatch(
      {
        ops: [
          { op: 'setCity', value: ' Udai‮pur ' },
          { op: 'toggleCategory', value: 'decor', enabled: false },
          { op: 'toggleCategory', value: 'decor', enabled: false },
          { op: 'setDiet', value: context.diet.menu === 'jain' ? 'veg' : 'jain' },
          { op: 'setAlcohol', value: !context.alcohol },
          { op: 'setDateFlexible', value: !context.dateFlexible },
          { op: 'setBudget', value: null },
          { op: 'setGuests', value: context.guests + 1 },
        ],
      },
      context,
      TODAY,
    );
    expect(patch?.ops).toHaveLength(MAX_PATCH_OPS);
    expect(patch?.ops[0]).toEqual({ op: 'setCity', value: 'Udaipur' });
    expect(patch?.ops.filter((op) => op.op === 'toggleCategory')).toHaveLength(1);
    expect(applyAskPatch({ ops: [{ op: 'setCity', value: '​' }] }, context, TODAY)).toBeUndefined();
    if (context.cut !== undefined) {
      expect(
        applyAskPatch({ ops: [{ op: 'setPriority', value: context.cut }] }, context, TODAY),
      ).toBeUndefined();
    }
    expect(
      applyAskPatch(
        { ops: [{ op: 'setPriority', value: 'photo_video' }] },
        { ...context, cut: 'decor' },
        TODAY,
      )?.ops,
    ).toHaveLength(1);
  });
});
