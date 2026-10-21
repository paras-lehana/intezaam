/**
 * Planner form validation: the shared context schema plus the two checks only a form needs.
 *
 * Responsibility: validate the candidate context with `eventContextSchema` (the same
 * contract the server and the engine use), turn each issue into a plain message on the
 * field that owns it, and add the form-only rules — an empty budget box is an error unless
 * "Estimate it for me" is ticked, and an empty date unless "Date not fixed yet" is.
 * Boundary: pure; the hook decides when to show errors and where focus goes.
 */
import { type EventContext, eventContextSchema } from '@intezaam/core/schemas';
import { contextInputFromState } from './form-context';
import {
  FIELD_KEYS,
  FIELD_MESSAGES,
  type FieldErrors,
  type FieldKey,
  fieldForPath,
} from './form-fields';
import type { PlannerFormState } from './form-state';

export type ValidationResult =
  | { readonly ok: true; readonly context: EventContext }
  | { readonly ok: false; readonly errors: FieldErrors };

/**
 * Validates the form; on success returns the parsed context exactly as the schema outputs it.
 * @example
 * validatePlannerForm(EMPTY_FORM_STATE).ok; // false — the five essentials are empty
 */
export function validatePlannerForm(state: PlannerFormState): ValidationResult {
  const errors: Partial<Record<FieldKey, string>> = {};
  // The schema treats an absent budget as "estimate it for me", so the empty box is checked here.
  if (!state.estimateBudget && state.budget.trim() === '') errors.budget = FIELD_MESSAGES.budget;
  // The schema's date rule runs only once every field parses; checking here shows it with the rest.
  if (!state.dateFlexible && state.dateIso === '') errors.date = FIELD_MESSAGES.date;

  // Efficiency: one safeParse per state change is microseconds; the form never debounces it.
  const parsed = eventContextSchema.safeParse(contextInputFromState(state));
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = fieldForPath(issue.path);
      errors[field] ??= issue.code === 'custom' ? issue.message : FIELD_MESSAGES[field];
    }
  }
  if (parsed.success && Object.keys(errors).length === 0) return { ok: true, context: parsed.data };
  return { ok: false, errors };
}

/**
 * The first field with an error, in the order the form shows them.
 * @example
 * firstInvalidField({ city: 'Type the city or town.' }); // 'city'
 */
export function firstInvalidField(errors: FieldErrors): FieldKey | undefined {
  return FIELD_KEYS.find((key) => errors[key] !== undefined);
}
