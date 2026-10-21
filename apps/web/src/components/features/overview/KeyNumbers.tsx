/**
 * The handful of numbers a family asks first, each with "Why this?".
 *
 * Responsibility: budget, per guest, contingency, expected guests, plates to guarantee,
 * rooms, days to go and vendors to book — read from one table so every number carries its
 * trace. Boundary: display only; every figure is the engine's.
 */
import type { ReactElement, ReactNode } from 'react';
import type { Plan } from '@intezaam/core/schemas';
import { MoneyCell } from '../common/MoneyCell';
import { PanelSection } from '../common/PanelSection';
import { TraceDisclosure } from '../common/TraceDisclosure';

export interface KeyNumbersProps {
  readonly plan: Plan;
}

interface KeyNumber {
  readonly label: string;
  readonly value: (plan: Plan) => ReactNode;
  readonly traceIds: (plan: Plan) => readonly string[];
}

const COUNT = new Intl.NumberFormat('en-IN');

function daysToGo(plan: Plan): string {
  const days = plan.timeline.daysToEvent;
  if (days === null) return 'Date not fixed';
  return days < 0 ? 'The date has passed' : COUNT.format(days);
}

export const KEY_NUMBERS: readonly KeyNumber[] = [
  {
    label: 'Budget',
    value: (plan) => <MoneyCell amount={plan.budget.totalInr} />,
    traceIds: (plan) => plan.budget.traceIds,
  },
  {
    label: 'Per guest',
    value: (plan) => <MoneyCell amount={plan.budget.perGuestInr} />,
    traceIds: (plan) => plan.budget.traceIds,
  },
  {
    label: 'Kept aside (contingency)',
    value: (plan) => <MoneyCell amount={plan.budget.contingencyInr} />,
    traceIds: (plan) =>
      plan.budget.lines.find((line) => line.category === 'contingency')?.traceIds ?? [],
  },
  {
    label: 'Guests expected',
    value: (plan) =>
      `${COUNT.format(plan.headcount.expected)} of ${COUNT.format(plan.headcount.invited)}`,
    traceIds: (plan) => plan.headcount.traceIds,
  },
  {
    label: 'Plates to guarantee',
    value: (plan) => COUNT.format(plan.headcount.plateGuarantee),
    traceIds: (plan) => plan.headcount.traceIds,
  },
  {
    label: 'Rooms for outstation guests',
    value: (plan) => COUNT.format(plan.headcount.rooms),
    traceIds: (plan) => plan.headcount.traceIds,
  },
  { label: 'Days to go', value: daysToGo, traceIds: (plan) => plan.timeline.traceIds },
  {
    label: 'Vendors to book',
    value: (plan) => COUNT.format(plan.vendors.length),
    traceIds: (plan) => plan.vendors.flatMap((vendor) => vendor.traceIds).slice(0, 1),
  },
];

export function KeyNumbers({ plan }: KeyNumbersProps): ReactElement {
  return (
    <PanelSection id="overview-numbers" title="Key numbers">
      <dl className="key-numbers">
        {KEY_NUMBERS.map((entry) => (
          <div key={entry.label} className="key-numbers__item">
            <dt>{entry.label}</dt>
            <dd className="key-numbers__value">{entry.value(plan)}</dd>
            <dd>
              <TraceDisclosure plan={plan} traceIds={entry.traceIds(plan)} subject={entry.label} />
            </dd>
          </div>
        ))}
      </dl>
    </PanelSection>
  );
}
