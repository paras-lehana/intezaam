/**
 * Where the money goes: every budget line with amount, share, per guest, cost type and
 * "Why this?", with the bars above as a visual summary.
 *
 * Responsibility: the budget split (feature #10) as a real data table — caption,
 * column and row headers, a total row — so the numbers are readable without the bars.
 * The lines always add up to the total exactly (largest-remainder split in core).
 * Boundary: display only; changes go through CategoryControls.
 */
import type { ReactElement } from 'react';
import type { Plan } from '@intezaam/core/schemas';
import { MoneyCell } from '../common/MoneyCell';
import { PanelSection } from '../common/PanelSection';
import { TableScroll } from '../common/TableScroll';
import { TraceDisclosure } from '../common/TraceDisclosure';
import { BudgetBars } from './BudgetBars';
import { COST_TYPE_LABELS, formatShare } from './money-format';

export interface BudgetTableProps {
  readonly plan: Plan;
}

const GUESTS = new Intl.NumberFormat('en-IN');

export function BudgetTable({ plan }: BudgetTableProps): ReactElement {
  const { budget, contextEcho } = plan;
  const source = budget.source === 'estimate' ? 'estimated for you' : 'your budget';
  return (
    <PanelSection
      id="money-split"
      title="Where the money goes"
      lede={
        <>
          <MoneyCell amount={budget.totalInr} /> ({source}) for {GUESTS.format(contextEcho.guests)}{' '}
          guests — <MoneyCell amount={budget.perGuestInr} /> a guest.
        </>
      }
    >
      <BudgetBars lines={budget.lines} />
      <TableScroll label="Budget by category">
        <table className="data-table budget-table">
          <caption>Budget by category</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col" className="num">
                Amount
              </th>
              <th scope="col" className="num">
                Share
              </th>
              <th scope="col" className="num">
                Per guest
              </th>
              <th scope="col">Cost type</th>
              <th scope="col">Why</th>
            </tr>
          </thead>
          <tbody>
            {budget.lines.map((line) => (
              <tr key={line.category}>
                <th scope="row">
                  {line.label}
                  {line.priority ? (
                    <span className="badge budget-table__priority">Priority</span>
                  ) : null}
                </th>
                <td className="num">
                  <MoneyCell amount={line.amountInr} />
                </td>
                <td className="num">{formatShare(line.shareBp)}</td>
                <td className="num">
                  {line.perGuestInr === undefined ? '—' : <MoneyCell amount={line.perGuestInr} />}
                </td>
                <td>{COST_TYPE_LABELS[line.costType]}</td>
                <td>
                  <TraceDisclosure plan={plan} traceIds={line.traceIds} subject={line.label} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td className="num">
                <MoneyCell amount={budget.totalInr} />
              </td>
              <td className="num">100%</td>
              <td className="num">
                <MoneyCell amount={budget.perGuestInr} />
              </td>
              <td />
              <td>
                <TraceDisclosure plan={plan} traceIds={budget.traceIds} subject="Total budget" />
              </td>
            </tr>
          </tfoot>
        </table>
      </TableScroll>
    </PanelSection>
  );
}
