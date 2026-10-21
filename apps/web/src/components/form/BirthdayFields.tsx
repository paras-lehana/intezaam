/**
 * Birthday detail: the age being celebrated and how many children are coming.
 *
 * Responsibility: the two numbers that drive age-banded ideas, kids' safety checks and
 * half portions. Boundary: both optional; shown only for birthdays.
 */
import type { ReactElement } from 'react';
import { GroupShell } from './GroupShell';
import { NumberField } from './NumberField';
import type { SectionProps } from './form-fields';

export function BirthdayFields({ state, update, errors, attention }: SectionProps): ReactElement {
  return (
    <GroupShell
      field="birthday"
      legend="Birthday details"
      error={errors.birthday}
      attention={attention === 'birthday'}
      className="group--pair"
    >
      <NumberField
        inputId="planner-birthday-age"
        label="Age turning"
        value={state.birthday.age}
        onChange={(age) => update({ birthday: { ...state.birthday, age } })}
      />
      <NumberField
        inputId="planner-birthday-kids"
        label="Children coming"
        value={state.birthday.kidsCount}
        onChange={(kidsCount) => update({ birthday: { ...state.birthday, kidsCount } })}
      />
    </GroupShell>
  );
}
