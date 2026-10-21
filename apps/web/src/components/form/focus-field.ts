/**
 * Moving keyboard focus to a planner field from anywhere on the plan page.
 *
 * Responsibility: scroll a field into view and focus its first control — after an invalid
 * submit (the form) or after a read brief is confirmed or set aside (the brief review), so
 * keyboard and screen-reader users never fall back to the top of the page. Boundary: DOM
 * only; the field ids come from `plannerFieldId`, and the caller decides which field.
 */
import { prefersReducedMotion } from '../ui/use-media-query';
import { type FieldKey, plannerFieldId } from './form-fields';

/** The brief box's text area id (BriefBox renders it; the brief review returns focus here). */
export const BRIEF_INPUT_ID = 'planner-brief';

const FOCUSABLE = 'input, select, textarea, button, [tabindex]';

function scrollAndFocus(target: HTMLElement): void {
  // scrollIntoView is missing in some engines (and in jsdom); focus still works without it.
  if (typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({
      block: 'center',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }
  target.focus({ preventScroll: true });
}

/**
 * Scrolls to a field and focuses its first control (or the field itself).
 * @example
 * focusPlannerField('budget'); // the budget input now has focus
 */
export function focusPlannerField(field: FieldKey): void {
  const container = document.getElementById(plannerFieldId(field));
  const target = container?.querySelector<HTMLElement>(FOCUSABLE) ?? container;
  if (target !== null) scrollAndFocus(target);
}

/**
 * Focuses the brief box's text area, keeping what the reader wrote there.
 * @example
 * focusBriefInput();
 */
export function focusBriefInput(): void {
  const input = document.getElementById(BRIEF_INPUT_ID);
  if (input !== null) scrollAndFocus(input);
}
