/**
 * The day-of run sheet: who arrives when, and who on your side looks after it.
 *
 * Responsibility: one table per function (FN-03) — time, what happens, owner — from the
 * vendors' arrival leads before the start time, printable as it is. Boundary: display
 * only; the engine places every slot.
 */
import type { ReactElement } from 'react';
import type { Plan } from '@intezaam/core/schemas';
import { formatIsoDate } from '../common/dates';
import { PanelSection } from '../common/PanelSection';
import { TableScroll } from '../common/TableScroll';
import { TraceDisclosure } from '../common/TraceDisclosure';

export interface RunSheetViewProps {
  readonly plan: Plan;
}

export function RunSheetView({ plan }: RunSheetViewProps): ReactElement | null {
  const sheets = plan.runSheet.filter((sheet) => sheet.slots.length > 0);
  if (sheets.length === 0) return null;
  return (
    <PanelSection
      id="timeline-run-sheet"
      title="Run sheet for the day"
      lede="Arrival times are counted back from each function's start."
    >
      {sheets.map((sheet) => (
        <TableScroll
          key={sheet.functionKind}
          label={`Run sheet: ${sheet.label}`}
          className="run-sheet"
        >
          <table className="data-table">
            <caption>
              {sheet.label}
              {sheet.dateIso === undefined ? '' : ` · ${formatIsoDate(sheet.dateIso)}`}
            </caption>
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">What</th>
                <th scope="col">Owner</th>
              </tr>
            </thead>
            <tbody>
              {sheet.slots.map((slot, index) => (
                <tr key={`${slot.atHhmm}-${index}`}>
                  <th scope="row" className="money">
                    {slot.atHhmm}
                  </th>
                  <td>{slot.title}</td>
                  <td>{slot.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <TraceDisclosure
            plan={plan}
            traceIds={sheet.traceIds}
            subject={`${sheet.label} run sheet`}
          />
        </TableScroll>
      ))}
    </PanelSection>
  );
}
