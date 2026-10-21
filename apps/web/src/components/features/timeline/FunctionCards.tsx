/**
 * The functions in order: which day, what time, how many guests, what budget, which rites.
 *
 * Responsibility: one card per function (FN-01/02) with its day relative to the main day
 * ("2 days before"), date, hours, guests, budget slice and ceremonies, plus "Why this?".
 * Boundary: display only; the run sheet below lists each function's arrivals.
 */
import type { ReactElement } from 'react';
import type { Plan, PlanFunction } from '@intezaam/core/schemas';
import { formatIsoDate } from '../common/dates';
import { MoneyCell } from '../common/MoneyCell';
import { PanelSection } from '../common/PanelSection';
import { TraceDisclosure } from '../common/TraceDisclosure';

export interface FunctionCardsProps {
  readonly plan: Plan;
}

const GUESTS = new Intl.NumberFormat('en-IN');

/**
 * A function's day relative to the main day, in words.
 * @example
 * dayOffsetText(-2); // '2 days before the main day'
 * dayOffsetText(0); // 'The main day'
 */
export function dayOffsetText(offset: number): string {
  if (offset === 0) return 'The main day';
  const days = Math.abs(offset);
  const unit = days === 1 ? 'day' : 'days';
  return `${days} ${unit} ${offset < 0 ? 'before' : 'after'} the main day`;
}

/**
 * When a function happens, in one line.
 * @example
 * functionWhen(mehendi); // '1 day before the main day · Fri, 19 Feb, 2027 · 15:00–20:00'
 */
export function functionWhen(fn: PlanFunction): string {
  const date = fn.dateIso === undefined ? [] : [formatIsoDate(fn.dateIso)];
  return [dayOffsetText(fn.dayOffset), ...date, `${fn.startHhmm}–${fn.endHhmm}`].join(' · ');
}

export function FunctionCards({ plan }: FunctionCardsProps): ReactElement | null {
  if (plan.functions.length === 0) return null;
  return (
    <PanelSection id="timeline-functions" title="Functions and days">
      <ul className="plain-list function-cards" role="list">
        {plan.functions.map((fn) => (
          <li key={fn.functionKind} className="function-card">
            <h4 className="function-card__title">{fn.label}</h4>
            <p className="function-card__when">{functionWhen(fn)}</p>
            <p>
              {GUESTS.format(fn.guests)} guests · <MoneyCell amount={fn.budgetInr} />
            </p>
            {fn.ceremonies.length === 0 ? null : (
              <p className="muted">Rites: {fn.ceremonies.join(', ')}</p>
            )}
            <TraceDisclosure plan={plan} traceIds={fn.traceIds} subject={fn.label} />
          </li>
        ))}
      </ul>
    </PanelSection>
  );
}
