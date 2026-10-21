/**
 * A stateful host for one planner-form section, so a test drives the real controlled inputs.
 *
 * Responsibility: hold the form state in React state starting from the form's own empty state,
 * apply each patch the section sends the way usePlannerForm does (a shallow merge), pass the
 * errors and the glow the test chooses, and expose the latest state for assertions. Boundary:
 * test-only; validation, fills and the context mapping are not involved.
 */
import { type ComponentType, type ReactElement, useEffect, useState } from 'react';
import { render } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { FieldErrors, FieldKey, SectionProps } from '../../components/form/form-fields';
import { EMPTY_FORM_STATE, type PlannerFormState } from '../../components/form/form-state';

export interface SectionOptions {
  /** Fields that differ from the empty form when the section first renders. */
  readonly start?: Partial<PlannerFormState>;
  readonly errors?: FieldErrors;
  readonly attention?: FieldKey | null;
}

export interface SectionHarness {
  readonly user: UserEvent;
  /** The state after every patch so far. */
  readonly latest: () => PlannerFormState;
}

interface SectionHostProps {
  readonly Section: ComponentType<SectionProps>;
  readonly initial: PlannerFormState;
  readonly errors: FieldErrors;
  readonly attention: FieldKey | null;
  readonly onState: (state: PlannerFormState) => void;
}

function SectionHost({
  Section,
  initial,
  errors,
  attention,
  onState,
}: SectionHostProps): ReactElement {
  const [state, setState] = useState(initial);
  useEffect(() => onState(state), [onState, state]);
  return (
    <Section
      state={state}
      update={(patch) => setState((previous) => ({ ...previous, ...patch }))}
      errors={errors}
      attention={attention}
    />
  );
}

/**
 * Renders one section over the empty form (plus `start`) and tracks its state.
 * @example
 * const { user, latest } = renderSection(FoodFields);
 */
export function renderSection(
  Section: ComponentType<SectionProps>,
  { start = {}, errors = {}, attention = null }: SectionOptions = {},
): SectionHarness {
  let latest: PlannerFormState = { ...EMPTY_FORM_STATE, ...start };
  render(
    <SectionHost
      Section={Section}
      initial={latest}
      errors={errors}
      attention={attention}
      onState={(state) => {
        latest = state;
      }}
    />,
  );
  return { user: userEvent.setup(), latest: () => latest };
}
