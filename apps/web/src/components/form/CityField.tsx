/**
 * Essential 3 of 5: the city or town, with suggestions from the city gazetteer.
 *
 * Responsibility: a free-text input backed by a datalist of the cities the planner knows
 * (their cost tier and rainy months are sourced). Boundary: every place may be typed; an
 * unknown one is planned at mid-size city costs and the plan says so.
 */
import type { ReactElement } from 'react';
import { CITY_TABLE, findCity } from '@intezaam/core/domain';
import { MAX_CITY_CHARS } from '@intezaam/core/schemas';
import { FieldShell } from './FieldShell';
import type { SectionProps } from './form-fields';

const CITY_LIST_ID = 'planner-city-list';

// Efficiency: the gazetteer is static, so the suggestion list is sorted once at module load.
const CITY_NAMES = CITY_TABLE.map((city) => city.name).sort((a, b) => a.localeCompare(b));

function cityHint(city: string): string {
  if (city.trim() === '') return 'Any Indian city or town.';
  const known = findCity(city);
  return known === undefined
    ? 'Not in our list — we will plan at mid-size city costs, and you can change that later.'
    : `${known.name}, ${known.state}.`;
}

export function CityField({ state, update, errors, attention }: SectionProps): ReactElement {
  return (
    <FieldShell
      field="city"
      inputId="planner-city"
      label="City or town"
      hint={cityHint(state.city)}
      error={errors.city}
      attention={attention === 'city'}
      renderControl={(a11y) => (
        <>
          <input
            {...a11y}
            type="text"
            list={CITY_LIST_ID}
            autoComplete="address-level2"
            maxLength={MAX_CITY_CHARS}
            value={state.city}
            onChange={(event) => update({ city: event.target.value })}
          />
          <datalist id={CITY_LIST_ID}>
            {CITY_NAMES.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </>
      )}
    />
  );
}
