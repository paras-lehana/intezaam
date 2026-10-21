/**
 * The verdict, stamped: money × time (and funding for community events), each with its
 * one-line reason and "Why this?".
 *
 * Responsibility: the plan's answer to "can this budget and date work?" as a ledger page
 * with a stamp, the axes as a description list (the stamp repeats them visually, so it is
 * hidden from assistive technology), and the likely spend range. The words come from core's
 * MONEY_LABELS, keyed by all five money bands: a wedding below the typical range reads
 * "Simple & home-style" (a home, hall or dharamshala wedding with a local caterer) and the
 * cheapest band "Needs changes" — never "not feasible". Boundary: display only.
 */
import type { ReactElement } from 'react';
import { FUNDING_LABELS, MONEY_LABELS, TIME_LABELS } from '@intezaam/core/engine';
import type { Plan } from '@intezaam/core/schemas';
import { MoneyCell } from '../common/MoneyCell';
import { TraceDisclosure } from '../common/TraceDisclosure';

export interface VerdictCardProps {
  readonly plan: Plan;
}

interface Axis {
  readonly key: string;
  readonly name: string;
  readonly status: string;
  readonly reason: string;
  readonly traceIds: readonly string[];
}

/**
 * The verdict's axes in reading order: money, time, then funding when there is one.
 * @example
 * verdictAxes(plan).map((axis) => axis.name); // ['Money', 'Time']
 */
export function verdictAxes(plan: Plan): readonly Axis[] {
  const { money, time, funding } = plan.verdict;
  const axes: Axis[] = [
    {
      key: 'money',
      name: 'Money',
      status: MONEY_LABELS[money.status],
      reason: money.reason,
      traceIds: money.traceIds,
    },
    {
      key: 'time',
      name: 'Time',
      status: TIME_LABELS[time.status],
      reason: time.reason,
      traceIds: time.traceIds,
    },
  ];
  if (funding !== undefined) {
    const status = FUNDING_LABELS[funding.status];
    axes.push({
      key: 'funding',
      name: 'Funding',
      status,
      reason: funding.reason,
      traceIds: funding.traceIds,
    });
  }
  return axes;
}

export function VerdictCard({ plan }: VerdictCardProps): ReactElement {
  const axes = verdictAxes(plan);
  const { low, high } = plan.verdict.estimateInr;
  return (
    <section className="verdict-card ledger-card ledger" aria-labelledby="verdict-heading">
      <p className="ledger-card__kicker">Plan verdict</p>
      <h3 id="verdict-heading" className="ledger-card__title">
        {plan.verdict.headline}
      </h3>
      <p className="stamp verdict-card__stamp" aria-hidden="true">
        <span className="stamp__main">{axes[0]?.status}</span>
        <span className="stamp__sub">{axes[1]?.status}</span>
      </p>
      <dl className="verdict-card__axes">
        {axes.map((axis) => (
          <div key={axis.key} className="verdict-card__axis">
            <dt>
              {axis.name}: <strong>{axis.status}</strong>
            </dt>
            <dd>
              {axis.reason}
              <TraceDisclosure
                plan={plan}
                traceIds={axis.traceIds}
                subject={`${axis.name} verdict`}
              />
            </dd>
          </div>
        ))}
      </dl>
      <p className="verdict-card__estimate">
        Likely spend for the plan as described: <MoneyCell amount={low} /> to{' '}
        <MoneyCell amount={high} />.
      </p>
    </section>
  );
}
