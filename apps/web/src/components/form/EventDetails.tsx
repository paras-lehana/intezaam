/**
 * Family-specific detail: the tradition and the functions to plan.
 *
 * Responsibility: an optional tradition (never inferred — only what the user picks) and
 * the functions that belong to the chosen family, labelled with the tradition's own names
 * where it has them (wedding → "Nikah"), and for a Punjabi or Sikh wedding whether it is an
 * Anand Karaj. Boundary: no functions ticked means the planner uses the occasion's (or
 * tradition's) usual functions.
 */
import type { ReactElement } from 'react';
import {
  FUNCTION_KINDS,
  FUNCTION_PROFILES,
  type FunctionKind,
  functionAllowedFor,
  TRADITION_PROFILES,
  TRADITIONS,
} from '@intezaam/core/domain';
import { MAX_FUNCTIONS } from '@intezaam/core/schemas';
import { AnandKarajField } from './AnandKarajField';
import { ChipGroup } from './ChipGroup';
import { FieldShell } from './FieldShell';
import { GroupShell } from './GroupShell';
import type { SectionProps } from './form-fields';
import type { PlannerFormState } from './form-state';

function functionLabel(kind: FunctionKind, state: PlannerFormState): string {
  const base = FUNCTION_PROFILES[kind].label;
  const local =
    state.tradition === '' ? undefined : TRADITION_PROFILES[state.tradition].functionNames[kind];
  return local === undefined || local === base ? base : `${base} (${local})`;
}

export function EventDetails({ state, update, errors, attention }: SectionProps): ReactElement {
  const family = state.family;
  const options =
    family === ''
      ? []
      : FUNCTION_KINDS.filter((kind) => functionAllowedFor(kind, family)).map((kind) => ({
          value: kind,
          label: functionLabel(kind, state),
        }));
  return (
    <>
      <FieldShell
        field="tradition"
        inputId="planner-tradition"
        label="Tradition (optional)"
        hint="Only if you want it to shape the functions, dates and vendors."
        error={errors.tradition}
        attention={attention === 'tradition'}
        renderControl={(a11y) => (
          <select
            {...a11y}
            value={state.tradition}
            onChange={(event) =>
              update({ tradition: TRADITIONS.find((item) => item === event.target.value) ?? '' })
            }
          >
            <option value="">No particular tradition</option>
            {TRADITIONS.map((tradition) => (
              <option key={tradition} value={tradition}>
                {TRADITION_PROFILES[tradition].label}
              </option>
            ))}
          </select>
        )}
      />
      {family === 'wedding' && state.tradition === 'punjabi-sikh' ? (
        <AnandKarajField
          value={state.anandKaraj}
          onChange={(anandKaraj) => update({ anandKaraj })}
        />
      ) : null}
      {options.length === 0 ? null : (
        <GroupShell
          field="functions"
          legend="Functions to plan"
          hint={`Leave all unticked for the usual set. Up to ${MAX_FUNCTIONS}.`}
          error={errors.functions}
          attention={attention === 'functions'}
        >
          <ChipGroup
            name="planner-functions"
            options={options}
            selected={state.functions}
            max={MAX_FUNCTIONS}
            onChange={(functions) => update({ functions })}
          />
        </GroupShell>
      )}
    </>
  );
}
