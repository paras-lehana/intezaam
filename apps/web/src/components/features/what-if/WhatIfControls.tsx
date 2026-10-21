/**
 * The What-if controls: guests, budget, date, indoor or outdoor, and dropping a function.
 *
 * Responsibility: sliders and pickers that move a scenario — guests within half either way,
 * budget ±50%, the date by whole weeks (only when a date is fixed), the venue setting and
 * one function to drop (when there is more than one) — each value also in words.
 * Boundary: controlled; the tool turns the scenario into a typed change and re-plans.
 */
import type { ReactElement } from 'react';
import { formatInr } from '@intezaam/core';
import {
  FUNCTION_PROFILES,
  type FunctionKind,
  VENUE_SETTINGS,
  VENUE_SETTING_LABELS,
} from '@intezaam/core/domain';
import type { EventContext, Plan } from '@intezaam/core/schemas';
import { pickOption } from '../people/guest-rules';
import { LabelledSelect } from '../people/LabelledSelect';
import { RangeControl } from './RangeControl';
import {
  BUDGET_RANGE,
  DATE_SHIFT_RANGE,
  type WhatIfScenario,
  guestRange,
  shiftedBudget,
} from './what-if-scenario';

export interface WhatIfControlsProps {
  readonly plan: Plan;
  readonly context: EventContext;
  readonly scenario: WhatIfScenario;
  readonly onChange: (scenario: WhatIfScenario) => void;
}

const DAYS_PER_WEEK = 7;

function signed(delta: number, more: string, less: string): string {
  if (delta === 0) return 'no change';
  return `${Math.abs(delta)} ${delta > 0 ? more : less}`;
}

export function WhatIfControls({
  plan,
  context,
  scenario,
  onChange,
}: WhatIfControlsProps): ReactElement {
  const functions = plan.contextEcho.functions;
  const dropOptions = [
    { value: '', label: 'Keep every function' },
    ...functions.map((kind) => ({
      value: kind,
      label: `Drop the ${FUNCTION_PROFILES[kind].label}`,
    })),
  ];
  const budget = shiftedBudget(plan.contextEcho.budgetInr, scenario.budgetPct);
  const weeks = scenario.dateShiftDays / DAYS_PER_WEEK;
  return (
    <div className="whatif-controls">
      <RangeControl
        id="whatif-guests"
        label="Guests"
        range={guestRange(context.guests)}
        value={scenario.guests}
        valueText={`${scenario.guests} guests (${signed(scenario.guests - context.guests, 'more', 'fewer')})`}
        onChange={(guests) => onChange({ ...scenario, guests })}
      />
      <RangeControl
        id="whatif-budget"
        label="Budget"
        range={BUDGET_RANGE}
        value={scenario.budgetPct}
        valueText={`${formatInr(budget)} (${scenario.budgetPct > 0 ? '+' : ''}${scenario.budgetPct}%)`}
        onChange={(budgetPct) => onChange({ ...scenario, budgetPct })}
      />
      {context.dateIso === undefined ? null : (
        <RangeControl
          id="whatif-date"
          label="Move the date"
          range={DATE_SHIFT_RANGE}
          value={scenario.dateShiftDays}
          valueText={signed(weeks, 'weeks later', 'weeks earlier')}
          onChange={(dateShiftDays) => onChange({ ...scenario, dateShiftDays })}
        />
      )}
      <LabelledSelect
        id="whatif-setting"
        label="Venue"
        value={scenario.setting}
        options={VENUE_SETTINGS.map((value) => ({ value, label: VENUE_SETTING_LABELS[value] }))}
        onChange={(value) =>
          onChange({ ...scenario, setting: pickOption(VENUE_SETTINGS, value, scenario.setting) })
        }
      />
      {functions.length > 1 ? (
        <LabelledSelect
          id="whatif-drop"
          label="Functions"
          value={scenario.dropFunction}
          options={dropOptions}
          onChange={(value) => {
            const dropFunction: FunctionKind | '' = functions.find((kind) => kind === value) ?? '';
            onChange({ ...scenario, dropFunction });
          }}
        />
      ) : null}
    </div>
  );
}
