/**
 * Tests for engine/what-if.ts — applyPatch, the typed what-if changes.
 *
 * Responsibility: prove every patch op changes exactly its field and keeps the context
 * consistent: fewer guests cap the children, a null budget means "estimate it", a new city
 * drops a stale tier override, an open date drops the date, functions start from the
 * defaults and keep only matching guest counts, category toggles are idempotent, and
 * priorities move to the top without clashing with the cut. Boundary: pure transforms.
 */
import { describe, expect, it } from 'vitest';
import { FUNCTION_KINDS, functionAllowedFor } from '../domain/functions.js';
import { applyPatch } from '../engine/what-if.js';
import { resolveFunctions } from '../engine/context.js';
import { MAX_FUNCTIONS, MAX_PRIORITIES } from '../schemas/limits.js';
import { eventContextSchema } from '../schemas/context.js';
import type { EventContext } from '../schemas/context.js';
import type { PatchOp } from '../schemas/patch.js';
import { birthday, homePuja, wedding } from './fixtures/engine-contexts.js';

const apply = (context: EventContext, ...ops: PatchOp[]): EventContext =>
  applyPatch(context, { ops });

describe('applyPatch: guests, budget, date and place', () => {
  it('sets guests and leaves the input unchanged', () => {
    const before = wedding();
    const after = apply(before, { op: 'setGuests', value: 250 });
    expect([after.guests, before.guests]).toEqual([250, wedding().guests]);
  });

  it('keeps the adults and caps the children when a kids’ party shrinks', () => {
    const party = birthday();
    const kids = party.birthday?.kidsCount ?? 0;
    const adults = party.guests - kids;
    const after = apply(party, { op: 'setGuests', value: adults + 5 });
    expect(after.birthday?.kidsCount).toBe(5);
    expect(apply(party, { op: 'setGuests', value: 1 }).birthday?.kidsCount).toBe(0);
  });

  it('removes the budget for "estimate it for me" and sets it otherwise', () => {
    expect('budgetInr' in apply(wedding(), { op: 'setBudget', value: null })).toBe(false);
    expect(apply(wedding(), { op: 'setBudget', value: 900_000 }).budgetInr).toBe(900_000);
  });

  it('sets a date (fixing it) and opens it again', () => {
    const fixed = apply(wedding({ dateFlexible: true }), { op: 'setDate', value: '2027-03-01' });
    expect([fixed.dateIso, fixed.dateFlexible]).toEqual(['2027-03-01', false]);
    const open = apply(wedding(), { op: 'setDateFlexible', value: true });
    expect(['dateIso' in open, open.dateFlexible]).toEqual([false, true]);
    expect(apply(wedding(), { op: 'setDateFlexible', value: false }).dateFlexible).toBe(false);
  });

  it('drops a tier override that belonged to the old city', () => {
    const after = apply(wedding({ tier: 'tier3' }), { op: 'setCity', value: 'Pune' });
    expect([after.city, 'tier' in after]).toEqual(['Pune', false]);
  });

  it('sets the venue setting, diet menu and alcohol', () => {
    const after = apply(
      wedding(),
      { op: 'setVenueSetting', value: 'home' },
      { op: 'setDiet', value: 'mixed' },
      { op: 'setAlcohol', value: true },
    );
    expect([after.venueSetting, after.diet.menu, after.alcohol]).toEqual(['home', 'mixed', true]);
    expect(after.diet.jainGuests).toBe(wedding().diet.jainGuests);
  });
});

describe('applyPatch: functions', () => {
  it('adds a function to the defaults, and ignores duplicates or functions the family lacks', () => {
    const puja = homePuja();
    const defaults = resolveFunctions(puja).functions;
    expect(defaults.length).toBeGreaterThan(0);
    const extra = apply(wedding(), { op: 'addFunction', value: 'haldi' });
    expect(extra.functions).toEqual([...wedding().functions, 'haldi']);
    expect(apply(wedding(), { op: 'addFunction', value: 'wedding' })).toEqual(wedding());
    expect(apply(wedding(), { op: 'addFunction', value: 'visarjan' })).toEqual(wedding());
  });

  it('stops adding at the function limit', () => {
    const allowed = FUNCTION_KINDS.filter((kind) => functionAllowedFor(kind, 'wedding'));
    const full = wedding({ functions: allowed.slice(0, MAX_FUNCTIONS) });
    const next = allowed[MAX_FUNCTIONS];
    if (next === undefined) throw new Error('a wedding allows more functions than the limit');
    expect(apply(full, { op: 'addFunction', value: next })).toEqual(full);
  });

  it('removes a function and its guest count, but never the last one', () => {
    const typed = wedding({ guestsByFunction: { sangeet: 200, wedding: 300 } });
    const after = apply(typed, { op: 'removeFunction', value: 'sangeet' });
    expect(after.functions).not.toContain('sangeet');
    expect(after.guestsByFunction).toEqual({ wedding: 300 });
    expect(eventContextSchema.safeParse(after).success).toBe(true);
    const untyped = apply(wedding(), { op: 'removeFunction', value: 'mehendi' });
    expect(untyped.guestsByFunction).toBeUndefined();
    const single = birthday();
    expect(apply(single, { op: 'removeFunction', value: 'party' })).toEqual(single);
  });
});

describe('applyPatch: categories and priorities', () => {
  it('disables and re-enables a category, idempotently', () => {
    const off = apply(wedding(), { op: 'toggleCategory', value: 'decor', enabled: false });
    expect(off.disabledCategories).toEqual(['decor']);
    const twice = apply(off, { op: 'toggleCategory', value: 'decor', enabled: false });
    expect(twice.disabledCategories).toEqual(['decor']);
    const on = apply(off, { op: 'toggleCategory', value: 'decor', enabled: true });
    expect(on.disabledCategories).toEqual([]);
  });

  it('moves a priority to the top, keeps at most three and clears a clashing cut', () => {
    const after = apply(wedding(), { op: 'setPriority', value: 'venue' });
    expect(after.priorities[0]).toBe('venue');
    expect(after.priorities.length).toBeLessThanOrEqual(MAX_PRIORITIES);
    const cut = wedding().cut;
    if (cut === undefined) throw new Error('the sample has a cut');
    const clash = apply(wedding({ priorities: [] }), { op: 'setPriority', value: cut });
    expect(['cut' in clash, clash.priorities]).toEqual([false, [cut]]);
    expect(after.cut).toBe(cut);
  });
});
