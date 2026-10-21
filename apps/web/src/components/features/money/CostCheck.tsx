/**
 * The bottom-up cost check: does the food line cover the meals as planned?
 *
 * Responsibility: show the per-plate band, plates, service charge and GST, the catering
 * estimate range against the food line, the verdict in words ("Covered" or "Short by …"),
 * room costs and the engine's notes, with "Why this?" (CST-01…06). Boundary: display only.
 */
import type { ReactElement } from 'react';
import type { Plan } from '@intezaam/core/schemas';
import { MoneyCell } from '../common/MoneyCell';
import { PanelSection } from '../common/PanelSection';
import { TraceDisclosure } from '../common/TraceDisclosure';
import { formatPercent } from './money-format';

export interface CostCheckProps {
  readonly plan: Plan;
}

const COUNT = new Intl.NumberFormat('en-IN');

export function CostCheck({ plan }: CostCheckProps): ReactElement {
  const check = plan.costCheck;
  const short = check.status === 'short';
  return (
    <PanelSection
      id="money-check"
      title="Bottom-up check"
      lede="Per plate × plates × service and tax, compared with the food line in your split."
    >
      <dl className="cost-check">
        <div>
          <dt>Per plate</dt>
          <dd>
            <MoneyCell amount={check.perPlateInr.min} /> to{' '}
            <MoneyCell amount={check.perPlateInr.max} />
          </dd>
        </div>
        <div>
          <dt>Plates</dt>
          <dd>{COUNT.format(check.plates)}</dd>
        </div>
        <div>
          <dt>Service charge and GST</dt>
          <dd>{formatPercent(check.taxesServicePct)}</dd>
        </div>
        <div>
          <dt>Meals, bottom-up</dt>
          <dd>
            <MoneyCell amount={check.cateringInr.low} /> to{' '}
            <MoneyCell amount={check.cateringInr.high} />
          </dd>
        </div>
        <div>
          <dt>Your food line</dt>
          <dd>
            <MoneyCell amount={check.cateringLineInr} />
          </dd>
        </div>
        {check.roomsInr === 0 ? null : (
          <div>
            <dt>Rooms for outstation guests</dt>
            <dd>
              <MoneyCell amount={check.roomsInr} />
            </dd>
          </div>
        )}
      </dl>
      <p className={`cost-check__status cost-check__status--${check.status}`}>
        <span aria-hidden="true">{short ? '▲' : '✓'}</span>{' '}
        {short ? (
          <>
            Short by about <MoneyCell amount={Math.abs(check.gapInr)} /> at the middle estimate.
          </>
        ) : (
          'Covered: the food line meets the middle estimate.'
        )}
      </p>
      {check.notes.length === 0 ? null : (
        <ul className="cost-check__notes">
          {check.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
      <TraceDisclosure plan={plan} traceIds={check.traceIds} subject="Bottom-up check" />
    </PanelSection>
  );
}
