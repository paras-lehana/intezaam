/**
 * GST per budget line: the default rate, the tax inside each line and the total.
 *
 * Responsibility: the GST view (feature #12, CST-06) — rates in force since the
 * date the engine reports, "not estimated" where research has no rate, and the standing
 * "depends on the contract" note. Boundary: display only; GST is counted once, per line.
 */
import type { ReactElement } from 'react';
import { CATEGORY_PROFILES } from '@intezaam/core/domain';
import type { Plan } from '@intezaam/core/schemas';
import { formatIsoDate } from '../common/dates';
import { MoneyCell } from '../common/MoneyCell';
import { PanelSection } from '../common/PanelSection';
import { TableScroll } from '../common/TableScroll';
import { TraceDisclosure } from '../common/TraceDisclosure';
import { formatGstRate } from './money-format';

export interface GstViewProps {
  readonly plan: Plan;
}

export function GstView({ plan }: GstViewProps): ReactElement {
  const { gst } = plan;
  return (
    <PanelSection
      id="money-gst"
      title="GST inside each line"
      lede={`Rates in force since ${formatIsoDate(gst.effectiveFromIso)}. ${gst.note}`}
    >
      <TableScroll label="GST by category">
        <table className="data-table">
          <caption>GST by category</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col" className="num">
                Rate
              </th>
              <th scope="col" className="num">
                GST
              </th>
            </tr>
          </thead>
          <tbody>
            {gst.lines.map((line) => (
              <tr key={line.category}>
                <th scope="row">{CATEGORY_PROFILES[line.category].label}</th>
                <td className="num">{formatGstRate(line.ratePct)}</td>
                <td className="num">
                  <MoneyCell amount={line.gstInr} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total GST</th>
              <td />
              <td className="num">
                <MoneyCell amount={gst.totalInr} />
              </td>
            </tr>
          </tfoot>
        </table>
      </TableScroll>
      <TraceDisclosure plan={plan} traceIds={gst.traceIds} subject="GST" />
    </PanelSection>
  );
}
