/**
 * ContextPatch — a typed, whitelisted change to an EventContext (GenAI job 5, what-if).
 *
 * Responsibility: the only edits the Ask assistant may propose and the what-if panel may
 * send: guests, budget, date, city, setting, diet, alcohol, functions, category toggles
 * and priorities. Each op is a discriminated union member, so an unknown op is rejected.
 * Boundary: shape only; `applyPatch` in the engine applies ops and the full context
 * schema re-validates the result.
 */
import { z } from 'zod';
import { BUDGET_CATEGORIES, RANKABLE_CATEGORIES } from '../domain/budget-categories.js';
import { VENUE_SETTINGS } from '../domain/context-options.js';
import { DIET_PROFILES } from '../domain/diet.js';
import { FUNCTION_KINDS } from '../domain/functions.js';
import { isoDateSchema } from './common.js';
import { budgetInrSchema, cityTextSchema, guestCountSchema } from './context.js';
import { MAX_PATCH_OPS } from './limits.js';

export const PATCH_OPS = [
  'setGuests',
  'setBudget',
  'setDate',
  'setDateFlexible',
  'setCity',
  'setVenueSetting',
  'setDiet',
  'setAlcohol',
  'addFunction',
  'removeFunction',
  'toggleCategory',
  'setPriority',
] as const;

export type PatchOpName = (typeof PATCH_OPS)[number];

export const patchOpSchema = z.discriminatedUnion('op', [
  z.strictObject({ op: z.literal('setGuests'), value: guestCountSchema }),
  /** null = "estimate it for me". */
  z.strictObject({ op: z.literal('setBudget'), value: budgetInrSchema.nullable() }),
  z.strictObject({ op: z.literal('setDate'), value: isoDateSchema }),
  z.strictObject({ op: z.literal('setDateFlexible'), value: z.boolean() }),
  /** The same cleaned city field as the context, so a patched city is never raw text. */
  z.strictObject({ op: z.literal('setCity'), value: cityTextSchema }),
  z.strictObject({ op: z.literal('setVenueSetting'), value: z.enum(VENUE_SETTINGS) }),
  z.strictObject({ op: z.literal('setDiet'), value: z.enum(DIET_PROFILES) }),
  z.strictObject({ op: z.literal('setAlcohol'), value: z.boolean() }),
  z.strictObject({ op: z.literal('addFunction'), value: z.enum(FUNCTION_KINDS) }),
  z.strictObject({ op: z.literal('removeFunction'), value: z.enum(FUNCTION_KINDS) }),
  /** Explicit on/off (not a flip) so applying a patch twice changes nothing more. */
  z.strictObject({
    op: z.literal('toggleCategory'),
    value: z.enum(BUDGET_CATEGORIES),
    enabled: z.boolean(),
  }),
  /** Moves a category to the top of the priorities (keeping at most three). */
  z.strictObject({ op: z.literal('setPriority'), value: z.enum(RANKABLE_CATEGORIES) }),
]);

export type PatchOp = z.infer<typeof patchOpSchema>;

export const contextPatchSchema = z.strictObject({
  ops: z.array(patchOpSchema).min(1).max(MAX_PATCH_OPS),
});

export type ContextPatch = z.infer<typeof contextPatchSchema>;
