/**
 * Essential 1 of 5: what are you celebrating — the family chips and, where a family has
 * several occasions, the occasion select.
 *
 * Responsibility: choose the event family (wedding, birthday, community event, family
 * function) and its kind. Boundary: picking a family resets the kind to that family's
 * first occasion and drops functions that do not belong to it (the hook does that).
 */
import type { ReactElement } from 'react';
import {
  EVENT_FAMILIES,
  EVENT_KIND_PROFILES,
  type EventFamily,
  type EventKind,
  FAMILY_PROFILES,
  kindsOfFamily,
} from '@intezaam/core/domain';
import { ChoiceGroup } from '../ui/ChoiceGroup';
import { FieldShell } from './FieldShell';
import { type SectionProps, plannerFieldId } from './form-fields';

export interface FamilyFieldProps extends SectionProps {
  readonly onFamily: (family: EventFamily) => void;
}

const FAMILY_OPTIONS = EVENT_FAMILIES.map((family) => ({
  value: family,
  label: FAMILY_PROFILES[family].label,
}));

export function FamilyField({
  state,
  update,
  errors,
  attention,
  onFamily,
}: FamilyFieldProps): ReactElement {
  const kinds = state.family === '' ? [] : kindsOfFamily(state.family);
  return (
    <div
      id={plannerFieldId('family')}
      className={attention === 'family' ? 'field field--attention' : 'field'}
    >
      <ChoiceGroup
        legend="What are you celebrating?"
        name="planner-family"
        variant="chips"
        options={FAMILY_OPTIONS}
        value={state.family}
        onChange={onFamily}
        error={errors.family}
      />
      {kinds.length > 1 ? (
        <FieldShell
          inputId="planner-kind"
          label="Occasion"
          renderControl={(a11y) => (
            <select
              {...a11y}
              value={state.kind}
              onChange={(event) => {
                const kind = kinds.find((candidate) => candidate === event.target.value);
                if (kind !== undefined) update({ kind });
              }}
            >
              {kinds.map((kind: EventKind) => (
                <option key={kind} value={kind}>
                  {EVENT_KIND_PROFILES[kind].label}
                </option>
              ))}
            </select>
          )}
        />
      ) : null}
    </div>
  );
}
