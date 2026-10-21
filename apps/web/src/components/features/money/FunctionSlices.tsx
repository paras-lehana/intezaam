/**
 * The budget per function: what the haldi, sangeet or puja gets, for how many guests.
 *
 * Responsibility: the per-function slices (FN-02) — per-guest lines split by each
 * function's guests, fixed lines by its weight — as a table with "Why this?". Boundary:
 * renders nothing for a single-function event, where the slice is the whole budget.
 */
import type { ReactElement } from 'react';
import type { Plan } from '@intezaam/core/schemas';
import { MoneyCell } from '../common/MoneyCell';
import { PanelSection } from '../common/PanelSection';
import { TableScroll } from '../common/TableScroll';
import { TraceDisclosure } from '../common/TraceDisclosure';

export interface FunctionSlicesProps {
  readonly plan: Plan;
}

const GUESTS = new Intl.NumberFormat('en-IN');

export function FunctionSlices({ plan }: FunctionSlicesProps): ReactElement | null {
  const slices = plan.budget.byFunction;
  if (slices.length < 2) return null;
  return (
    <PanelSection
      id="money-functions"
      title="Per function"
      lede="Food and per-guest costs follow each function's guests; fixed costs follow its size."
    >
      <TableScroll label="Budget by function">
        <table className="data-table">
          <caption>Budget by function</caption>
          <thead>
            <tr>
              <th scope="col">Function</th>
              <th scope="col" className="num">
                Guests
              </th>
              <th scope="col" className="num">
                Amount
              </th>
              <th scope="col" className="num">
                Per guest
              </th>
              <th scope="col">Why</th>
            </tr>
          </thead>
          <tbody>
            {slices.map((slice) => (
              <tr key={slice.functionKind}>
                <th scope="row">{slice.label}</th>
                <td className="num">{GUESTS.format(slice.guests)}</td>
                <td className="num">
                  <MoneyCell amount={slice.amountInr} />
                </td>
                <td className="num">
                  <MoneyCell amount={slice.perGuestInr} />
                </td>
                <td>
                  <TraceDisclosure plan={plan} traceIds={slice.traceIds} subject={slice.label} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </PanelSection>
  );
}
