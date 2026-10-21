/**
 * Essential 5 of 5: the budget in rupees, with lakh presets, or "Estimate it for me".
 *
 * Responsibility: take the budget the way families say it — a typed amount, one tap on a
 * round preset, or no figure at all — and read the typed amount back in Indian grouping.
 * Boundary: presets are convenient round numbers per family, not recommendations; the
 * estimate itself is computed by the engine.
 */
import type { ReactElement } from 'react';
import { formatInr, formatLakh } from '@intezaam/core';
import type { EventFamily } from '@intezaam/core/domain';
import { FieldShell } from './FieldShell';
import { parseTypedNumber } from './form-context';
import { type SectionProps, plannerFieldId } from './form-fields';

/** Round amounts families start from, by kind of celebration (not advice, just shortcuts). */
export const BUDGET_PRESETS: Readonly<Record<EventFamily, readonly number[]>> = {
  wedding: [500_000, 1_000_000, 2_000_000, 3_500_000, 5_000_000],
  birthday: [25_000, 50_000, 100_000, 200_000],
  community: [100_000, 200_000, 500_000, 1_000_000],
  'family-function': [50_000, 100_000, 200_000, 500_000],
};

/** Before a family is chosen, the wedding presets cover the widest range. */
const DEFAULT_PRESET_FAMILY: EventFamily = 'wedding';

function readBack(budget: string): string | undefined {
  const amount = parseTypedNumber(budget);
  return amount === undefined || !Number.isFinite(amount)
    ? undefined
    : `That is ${formatInr(amount)}.`;
}

export function BudgetField({ state, update, errors, attention }: SectionProps): ReactElement {
  const presets = BUDGET_PRESETS[state.family === '' ? DEFAULT_PRESET_FAMILY : state.family];
  return (
    <div className="budget-field">
      {state.estimateBudget ? (
        <p id={plannerFieldId('budget')} className="field field--note">
          <span className="field__label-text">Budget</span>
          <span className="field__hint">
            We will estimate a mid-range budget from your guests, city and the size of the event.
          </span>
        </p>
      ) : (
        <FieldShell
          field="budget"
          inputId="planner-budget"
          label="Budget in rupees (₹)"
          hint={readBack(state.budget)}
          error={errors.budget}
          attention={attention === 'budget'}
          renderControl={(a11y) => (
            <input
              {...a11y}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="e.g. 15,00,000"
              value={state.budget}
              onChange={(event) => update({ budget: event.target.value })}
            />
          )}
        />
      )}
      {state.estimateBudget ? null : (
        <div className="presets" role="group" aria-label="Quick budget amounts">
          {presets.map((amount) => (
            <button
              key={amount}
              type="button"
              className="preset"
              aria-pressed={parseTypedNumber(state.budget) === amount}
              onClick={() => update({ budget: String(amount) })}
            >
              {formatLakh(amount)}
            </button>
          ))}
        </div>
      )}
      <label className="check">
        <input
          type="checkbox"
          checked={state.estimateBudget}
          onChange={(event) => update({ estimateBudget: event.target.checked })}
        />
        <span>Estimate it for me</span>
      </label>
    </div>
  );
}
