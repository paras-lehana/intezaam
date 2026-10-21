/**
 * Plain-English descriptions of a typed plan change (a ContextPatch).
 *
 * Responsibility: say what each op does in words a family uses — "Guests: 250", "Move the
 * date to 12 Dec 2026", "Drop the Sangeet" — for the What-if summary, the Ask proposal and
 * the question "Explain this change" sends. One describer per op name, so a new op without
 * words is a compile error. Boundary: words only; applying a patch is the engine's job.
 */
import { formatInr } from '@intezaam/core';
import {
  CATEGORY_PROFILES,
  DIET_PROFILE_INFO,
  FUNCTION_PROFILES,
  VENUE_SETTING_LABELS,
} from '@intezaam/core/domain';
import type { ContextPatch, PatchOp, PatchOpName } from '@intezaam/core/schemas';
import { formatIsoDate } from '../common/dates';

/** Each op name mapped to its own op shape, so every describer is typed to its op. */
type OpByName = { [K in PatchOpName]: Extract<PatchOp, { op: K }> };

type Describe<K extends PatchOpName> = (op: OpByName[K]) => string;

const DESCRIBE: { readonly [K in PatchOpName]: Describe<K> } = {
  setGuests: ({ value }) => `Guests: ${value}`,
  setBudget: ({ value }) =>
    value === null ? 'Budget: estimate it for me' : `Budget: ${formatInr(value)}`,
  setDate: ({ value }) => `Move the date to ${formatIsoDate(value)}`,
  setDateFlexible: ({ value }) => (value ? 'The date is not fixed yet' : 'The date is fixed'),
  setCity: ({ value }) => `City: ${value}`,
  setVenueSetting: ({ value }) => `Venue: ${VENUE_SETTING_LABELS[value]}`,
  setDiet: ({ value }) => `Menu: ${DIET_PROFILE_INFO[value].label}`,
  setAlcohol: ({ value }) => (value ? 'Serve alcohol' : 'No alcohol'),
  addFunction: ({ value }) => `Add the ${FUNCTION_PROFILES[value].label}`,
  removeFunction: ({ value }) => `Drop the ${FUNCTION_PROFILES[value].label}`,
  toggleCategory: ({ value, enabled }) =>
    `${enabled ? 'Include' : 'Leave out'} ${CATEGORY_PROFILES[value].label.toLowerCase()}`,
  setPriority: ({ value }) => `Make ${CATEGORY_PROFILES[value].label.toLowerCase()} a top priority`,
};

function describeOp<K extends PatchOpName>(name: K, op: OpByName[K]): string {
  const describe: Describe<K> = DESCRIBE[name];
  return describe(op);
}

/**
 * One line per op, in order.
 * @example
 * describePatch({ ops: [{ op: 'setGuests', value: 250 }] }); // ['Guests: 250']
 */
export function describePatch(patch: ContextPatch): string[] {
  return patch.ops.map((op) => describeOp(op.op, op));
}

/**
 * The question "Explain this change" sends to the planner (within the 500-character cap).
 * @example
 * explainQuestion({ ops: [{ op: 'setGuests', value: 250 }] });
 * // 'What changes in my plan if I make this change: Guests: 250? Explain the trade-offs.'
 */
export function explainQuestion(patch: ContextPatch): string {
  return `What changes in my plan if I make this change: ${describePatch(patch).join('; ')}? Explain the trade-offs.`;
}
