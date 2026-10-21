/**
 * The Anand Karaj question for a Punjabi or Sikh wedding.
 *
 * Responsibility: ask once, in three answers, whether the wedding is an Anand Karaj (the
 * Sikh ceremony, held in a gurdwara) — a read brief that says so fills it, and the plan's
 * gurdwara rule follows the answer: yes makes it a firm requirement, "not said yet" keeps it
 * as an "if", no drops it. Boundary: shown only for a wedding with the Punjabi / Sikh
 * tradition; the caller decides that, and form-context.ts sends the answer only then.
 */
import type { ReactElement } from 'react';
import { ChoiceGroup, type ChoiceOption } from '../ui/ChoiceGroup';
import { ANAND_KARAJ_CHOICES, type AnandKarajChoice } from './form-state';

export const ANAND_KARAJ_LEGEND = 'Anand Karaj (Sikh ceremony)?';

/** Each answer in the family's words. */
export const ANAND_KARAJ_LABELS: Readonly<Record<AnandKarajChoice, string>> = {
  unsaid: 'Not said yet',
  yes: 'Yes, an Anand Karaj',
  no: 'No',
};

const OPTIONS: readonly ChoiceOption<AnandKarajChoice>[] = ANAND_KARAJ_CHOICES.map((value) => ({
  value,
  label: ANAND_KARAJ_LABELS[value],
}));

export interface AnandKarajFieldProps {
  readonly value: AnandKarajChoice;
  readonly onChange: (value: AnandKarajChoice) => void;
}

export function AnandKarajField({ value, onChange }: AnandKarajFieldProps): ReactElement {
  return (
    <ChoiceGroup<AnandKarajChoice>
      legend={ANAND_KARAJ_LEGEND}
      name="planner-anand-karaj"
      variant="chips"
      hint="An Anand Karaj is held in a gurdwara, so the plan books the ceremony around one."
      options={OPTIONS}
      value={value}
      onChange={onChange}
    />
  );
}
