/**
 * Essential 2 of 5: the date, or "Date not fixed yet".
 *
 * Responsibility: a native date input (the phone's own date picker) and the checkbox that
 * switches the timeline to undated mode. Boundary: when the date is not fixed the typed
 * date is kept in the state (unticking brings it back) but is not sent to the planner.
 */
import type { ReactElement } from 'react';
import { FieldShell } from './FieldShell';
import { type SectionProps, plannerFieldId } from './form-fields';

export function DateField({ state, update, errors, attention }: SectionProps): ReactElement {
  return (
    <div className="date-field">
      {state.dateFlexible ? (
        <p id={plannerFieldId('date')} className="field field--note">
          <span className="field__label-text">Date</span>
          <span className="field__hint">
            No date yet — the plan starts with “pick your date” and checks muhurat and festival
            clashes once you choose one.
          </span>
        </p>
      ) : (
        <FieldShell
          field="date"
          inputId="planner-date"
          label="Date of the main day"
          error={errors.date}
          attention={attention === 'date'}
          renderControl={(a11y) => (
            <input
              {...a11y}
              type="date"
              value={state.dateIso}
              onChange={(event) => update({ dateIso: event.target.value })}
            />
          )}
        />
      )}
      <label className="check">
        <input
          type="checkbox"
          checked={state.dateFlexible}
          onChange={(event) => update({ dateFlexible: event.target.checked })}
        />
        <span>Date not fixed yet</span>
      </label>
    </div>
  );
}
