/**
 * Venue and travel: the setting, the area, and how many guests travel in.
 *
 * Responsibility: indoor / outdoor / mixed / home (rain risk and the outdoor sound rule
 * follow from it), the area for the space check, and the out-of-town share behind the
 * attendance rate and room count. Boundary: all optional; the defaults are an indoor
 * venue and nobody travelling.
 */
import type { ReactElement } from 'react';
import { VENUE_SETTING_LABELS, VENUE_SETTINGS, type VenueSetting } from '@intezaam/core/domain';
import { ChoiceGroup } from '../ui/ChoiceGroup';
import { GroupShell } from './GroupShell';
import { NumberField } from './NumberField';
import { type SectionProps, plannerFieldId } from './form-fields';

const SETTING_OPTIONS = VENUE_SETTINGS.map((setting) => ({
  value: setting,
  label: VENUE_SETTING_LABELS[setting],
}));

export function VenueFields({ state, update, errors, attention }: SectionProps): ReactElement {
  return (
    <>
      <div
        id={plannerFieldId('venue')}
        className={attention === 'venue' ? 'field field--attention' : 'field'}
      >
        <ChoiceGroup<VenueSetting>
          legend="Venue setting"
          name="planner-venue"
          variant="chips"
          options={SETTING_OPTIONS}
          value={state.venueSetting}
          onChange={(venueSetting) => update({ venueSetting })}
          error={errors.venue}
        />
        <NumberField
          inputId="planner-area"
          label="Venue area in square feet (optional)"
          hint="Lets the plan check whether everyone fits."
          value={state.areaSqft}
          onChange={(areaSqft) => update({ areaSqft })}
        />
      </div>
      <GroupShell
        field="travel"
        legend="Guests from out of town"
        error={errors.travel}
        attention={attention === 'travel'}
      >
        <NumberField
          inputId="planner-outstation"
          label="Share travelling in (%)"
          hint="Out-of-town guests attend less often and need rooms."
          value={state.outstationPct}
          onChange={(outstationPct) => update({ outstationPct })}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={state.destination}
            onChange={(event) => update({ destination: event.target.checked })}
          />
          <span>It is a destination event (most guests travel)</span>
        </label>
      </GroupShell>
    </>
  );
}
