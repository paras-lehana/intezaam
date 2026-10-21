/**
 * What-if patches — apply a typed, whitelisted change to an EventContext.
 *
 * Responsibility: apply each ContextPatch op in order (guests, budget, date, city, setting,
 * diet, alcohol, functions, category toggles, priorities), keeping the context consistent:
 * a changed city drops a stale tier override, removing a function drops its guest count,
 * fewer guests cap the children, and adding to the default functions starts from those
 * defaults. Boundary: pure transformation; callers re-validate with eventContextSchema and
 * re-plan with buildPlan (diffPlans compares the two plans).
 */
import { type FunctionKind, functionAllowedFor } from '../domain/functions.js';
import { MAX_FUNCTIONS, MAX_PRIORITIES } from '../schemas/limits.js';
import type { EventContext } from '../schemas/context.js';
import type { ContextPatch, PatchOp } from '../schemas/patch.js';
import { resolveFunctions } from './context.js';

/** Each op name mapped to its own op shape (a correlated union, so handlers stay typed). */
type OpByName = { [K in PatchOp['op']]: Extract<PatchOp, { op: K }> };

type Apply<K extends keyof OpByName> = (context: EventContext, op: OpByName[K]) => EventContext;

/** Fewer guests keep the adults and cap the children (a kids' party shrinks by children). */
const setGuests: Apply<'setGuests'> = (context, { value }) => {
  const kids = context.birthday?.kidsCount;
  if (context.birthday === undefined || kids === undefined) return { ...context, guests: value };
  const adults = Math.max(0, context.guests - kids);
  const kidsCount = Math.max(0, Math.min(kids, value - adults));
  return { ...context, guests: value, birthday: { ...context.birthday, kidsCount } };
};

/** null = "estimate it for me": the budget key is removed, not set to undefined. */
const setBudget: Apply<'setBudget'> = (context, { value }) => {
  if (value !== null) return { ...context, budgetInr: value };
  const { budgetInr: _removed, ...rest } = context;
  return rest;
};

const setCity: Apply<'setCity'> = (context, { value }) => {
  // A tier override belonged to the old city.
  const { tier: _stale, ...rest } = context;
  return { ...rest, city: value };
};

const setDateFlexible: Apply<'setDateFlexible'> = (context, { value }) => {
  if (!value) return { ...context, dateFlexible: false };
  const { dateIso: _open, ...rest } = context;
  return { ...rest, dateFlexible: true };
};

const addFunction: Apply<'addFunction'> = (context, { value }) => {
  // Adding to the defaults starts from the defaults, so nothing silently disappears.
  const current = resolveFunctions(context).functions;
  const allowed = functionAllowedFor(value, context.family);
  if (!allowed || current.includes(value) || current.length >= MAX_FUNCTIONS) return context;
  return { ...context, functions: [...current, value] };
};

const removeFunction: Apply<'removeFunction'> = (context, { value }) => {
  const remaining = resolveFunctions(context).functions.filter((kind) => kind !== value);
  // An empty list means "use the defaults", which would bring the function back.
  if (remaining.length === 0) return context;
  const typed = context.guestsByFunction;
  if (typed === undefined) return { ...context, functions: remaining };
  // Guest counts are kept only for the functions that remain (the schema requires it).
  const guestsByFunction: Partial<Record<FunctionKind, number>> = {};
  for (const kind of remaining) {
    const count = typed[kind];
    if (count !== undefined) guestsByFunction[kind] = count;
  }
  return { ...context, functions: remaining, guestsByFunction };
};

const toggleCategory: Apply<'toggleCategory'> = (context, { value, enabled }) => {
  const others = context.disabledCategories.filter((category) => category !== value);
  return { ...context, disabledCategories: enabled ? others : [...others, value] };
};

const setPriority: Apply<'setPriority'> = (context, { value }) => {
  const priorities = [value, ...context.priorities.filter((p) => p !== value)].slice(
    0,
    MAX_PRIORITIES,
  );
  if (context.cut !== value) return { ...context, priorities };
  const { cut: _clash, ...rest } = context;
  return { ...rest, priorities };
};

/** One handler per op: a new op without a handler is a compile error. */
const HANDLERS: { readonly [K in keyof OpByName]: Apply<K> } = {
  setGuests,
  setBudget,
  setDate: (context, { value }) => ({ ...context, dateIso: value, dateFlexible: false }),
  setDateFlexible,
  setCity,
  setVenueSetting: (context, { value }) => ({ ...context, venueSetting: value }),
  setDiet: (context, { value }) => ({ ...context, diet: { ...context.diet, menu: value } }),
  setAlcohol: (context, { value }) => ({ ...context, alcohol: value }),
  addFunction,
  removeFunction,
  toggleCategory,
  setPriority,
};

function applyOp<K extends keyof OpByName>(
  context: EventContext,
  name: K,
  op: OpByName[K],
): EventContext {
  const handler: Apply<K> = HANDLERS[name];
  return handler(context, op);
}

/**
 * Applies a patch's ops in order and returns the new context (the input is not changed).
 * @example
 * applyPatch(ctx, { ops: [{ op: 'setGuests', value: 250 }] }).guests; // 250
 */
export function applyPatch(context: EventContext, patch: ContextPatch): EventContext {
  return patch.ops.reduce<EventContext>((current, op) => applyOp(current, op.op, op), context);
}
