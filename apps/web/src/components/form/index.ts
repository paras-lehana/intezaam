/**
 * Planner form barrel — what the plan page needs to embed the form.
 *
 * Responsibility: export the form, its fill contract, the submit label and the helpers
 * that turn a context into form state and back (useful for applying a change and showing
 * it in the form). Boundary: the sections themselves stay internal to the form.
 */
export { DEFAULT_SUBMIT_LABEL, PlannerForm, type PlannerFormProps } from './PlannerForm';
export { contextInputFromState, parseTypedNumber } from './form-context';
export { BRIEF_INPUT_ID, focusBriefInput, focusPlannerField } from './focus-field';
export { EMPTY_FORM_STATE, fillState, type PlannerFormState } from './form-state';
export { validatePlannerForm, type ValidationResult } from './form-validation';
export { type PlannerFormFill } from './use-planner-form';
