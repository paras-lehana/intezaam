/**
 * Food: the menu, special counters and alcohol.
 *
 * Responsibility: the diet mix that prices the plates (non-veg costs more per plate), the
 * Jain, halal and no-onion-no-garlic needs that add counters and timing rules, and whether
 * alcohol is served (it adds a bartender and a licence check). Boundary: the defaults are
 * a vegetarian menu, no special counters and no alcohol.
 */
import type { ReactElement } from 'react';
import { DIET_PROFILE_INFO, DIET_PROFILES, type DietProfile } from '@intezaam/core/domain';
import type { DietChoice } from '@intezaam/core/schemas';
import { ChoiceGroup } from '../ui/ChoiceGroup';
import { GroupShell } from './GroupShell';
import type { SectionProps } from './form-fields';

const MENU_OPTIONS = DIET_PROFILES.map((menu) => ({
  value: menu,
  label: DIET_PROFILE_INFO[menu].label,
}));

/** The three yes/no needs, with what each adds to the plan. */
const DIET_NEEDS: readonly {
  readonly key: Exclude<keyof DietChoice, 'menu'>;
  readonly label: string;
}[] = [
  { key: 'jainGuests', label: 'Some guests eat Jain food (served before sunset)' },
  { key: 'halal', label: 'Halal meat needed' },
  { key: 'satvik', label: 'A no-onion, no-garlic option' },
];

export function FoodFields({ state, update, errors, attention }: SectionProps): ReactElement {
  const { diet } = state;
  return (
    <GroupShell field="diet" legend="Food" error={errors.diet} attention={attention === 'diet'}>
      <ChoiceGroup<DietProfile>
        legend="Menu"
        name="planner-menu"
        variant="chips"
        options={MENU_OPTIONS}
        value={diet.menu}
        onChange={(menu) => update({ diet: { ...diet, menu } })}
      />
      {DIET_NEEDS.map(({ key, label }) => (
        <label key={key} className="check">
          <input
            type="checkbox"
            checked={diet[key]}
            onChange={(event) => update({ diet: { ...diet, [key]: event.target.checked } })}
          />
          <span>{label}</span>
        </label>
      ))}
      <label className="check">
        <input
          type="checkbox"
          checked={state.alcohol}
          onChange={(event) => update({ alcohol: event.target.checked })}
        />
        <span>Alcohol will be served</span>
      </label>
    </GroupShell>
  );
}
