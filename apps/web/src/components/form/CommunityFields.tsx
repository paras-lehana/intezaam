/**
 * Community detail: premises, days, households, footfall, money already in hand, volunteers.
 *
 * Responsibility: the inputs behind permissions (public premises need pandal and police
 * permission), crowd checks (footfall), the chanda maths (households, sponsors, society
 * fund, tickets) and the volunteer roster. Boundary: shown only for community events;
 * amounts are whole rupees.
 */
import type { ReactElement } from 'react';
import { PREMISES, PREMISES_LABELS, type Premises } from '@intezaam/core/domain';
import { ChoiceGroup } from '../ui/ChoiceGroup';
import { GroupShell } from './GroupShell';
import { NumberField } from './NumberField';
import type { SectionProps } from './form-fields';
import type { CommunityState } from './form-state';

const PREMISES_OPTIONS = PREMISES.map((premises) => ({
  value: premises,
  label: PREMISES_LABELS[premises],
}));

/** The numeric community inputs, in reading order, with their labels. */
const COMMUNITY_NUMBERS: readonly {
  readonly key: Exclude<keyof CommunityState, 'premises'>;
  readonly label: string;
}[] = [
  { key: 'days', label: 'Number of days' },
  { key: 'households', label: 'Households contributing' },
  { key: 'footfall', label: 'Expected visitors in all' },
  { key: 'sponsorsInr', label: 'Sponsorship (₹)' },
  { key: 'rwaFundInr', label: 'Society or RWA fund (₹)' },
  { key: 'ticketsInr', label: 'Ticket or stall income (₹)' },
  { key: 'volunteers', label: 'Volunteers available' },
];

export function CommunityFields({ state, update, errors, attention }: SectionProps): ReactElement {
  const { community } = state;
  return (
    <GroupShell
      field="community"
      legend="Community details"
      hint="Visitors decide crowd and safety checks; households and money in hand decide each household's share."
      error={errors.community}
      attention={attention === 'community'}
      className="group--grid"
    >
      <ChoiceGroup<Premises>
        legend="Where is it held?"
        name="planner-premises"
        variant="chips"
        options={PREMISES_OPTIONS}
        value={community.premises}
        onChange={(premises) => update({ community: { ...community, premises } })}
        className="group__wide"
      />
      {COMMUNITY_NUMBERS.map(({ key, label }) => (
        <NumberField
          key={key}
          inputId={`planner-community-${key}`}
          label={label}
          value={community[key]}
          onChange={(value) => update({ community: { ...community, [key]: value } })}
        />
      ))}
    </GroupShell>
  );
}
