/**
 * The chanda calculator's inputs: flat or tiered, households, and the offsets.
 *
 * Responsibility: labelled controls for the committee's numbers — a flat/tiered choice,
 * households (or households per flat size, with the COM-02 weights shown), sponsors, the RWA
 * fund and ticket sales — typed as people write them ("₹60,000"). Boundary: controlled;
 * the hook in use-chanda.ts owns the draft and the engine run.
 */
import type { ReactElement } from 'react';
import { FLAT_SIZE_WEIGHTS, FLAT_SIZES, type FlatSize } from '@intezaam/core/domain';
import { ChoiceGroup } from '../../ui/ChoiceGroup';
import type { ChandaDraft, ChandaMode } from './chanda';
import { WholeField } from './WholeField';

export interface ChandaInputsProps {
  readonly draft: ChandaDraft;
  readonly onChange: (draft: ChandaDraft) => void;
}

const MODE_OPTIONS: readonly { value: ChandaMode; label: string }[] = [
  { value: 'flat', label: 'Same for every household' },
  { value: 'tiered', label: 'By flat size' },
];

const FLAT_SIZE_LABELS: Readonly<Record<FlatSize, string>> = {
  small: 'Small flats (1 BHK)',
  medium: 'Medium flats (2 BHK)',
  large: 'Large flats (3 BHK+)',
};

type OffsetKey = 'sponsors' | 'rwaFund' | 'tickets';

const OFFSET_LABELS: Readonly<Record<OffsetKey, string>> = {
  sponsors: 'Sponsors (₹)',
  rwaFund: 'From the RWA fund (₹)',
  tickets: 'Ticket or stall sales (₹)',
};

const OFFSETS: readonly OffsetKey[] = ['sponsors', 'rwaFund', 'tickets'];

export function ChandaInputs({ draft, onChange }: ChandaInputsProps): ReactElement {
  return (
    <div className="chanda-inputs">
      <ChoiceGroup
        legend="How households share the cost"
        name="chanda-mode"
        variant="chips"
        options={MODE_OPTIONS}
        value={draft.mode}
        onChange={(mode) => onChange({ ...draft, mode })}
      />
      {draft.mode === 'flat' ? (
        <WholeField
          id="chanda-households"
          label="Households contributing"
          value={draft.households}
          onChange={(households) => onChange({ ...draft, households })}
        />
      ) : (
        FLAT_SIZES.map((size) => (
          <WholeField
            key={size}
            id={`chanda-tier-${size}`}
            label={`${FLAT_SIZE_LABELS[size]} — pays ×${FLAT_SIZE_WEIGHTS[size]}`}
            value={draft.tiers[size]}
            onChange={(count) => onChange({ ...draft, tiers: { ...draft.tiers, [size]: count } })}
          />
        ))
      )}
      {OFFSETS.map((key) => (
        <WholeField
          key={key}
          id={`chanda-${key}`}
          label={OFFSET_LABELS[key]}
          value={draft[key]}
          onChange={(amount) => onChange({ ...draft, [key]: amount })}
        />
      ))}
    </div>
  );
}
