/**
 * Cash needed per month: every vendor's advance, second payment and balance, added up.
 *
 * Responsibility: the payment-milestone calendar (synthesis feature #15, VEN-04) — the
 * month-by-month cash table with the vendors paid in each month, the "get it in writing"
 * checklist, and an "Assumption" label, because no industry standard schedule exists and
 * the default split is ours (grade D). Boundary: display only; each vendor's own
 * milestones are on the Vendors tab.
 */
import type { ReactElement } from 'react';
import { DEFAULT_PAYMENT_SCHEDULE, VENDOR_PROFILES } from '@intezaam/core/domain';
import type { Plan } from '@intezaam/core/schemas';
import { ASSUMPTION_BADGE } from '../common/ConfidenceLabel';
import { formatMonthKey } from '../common/dates';
import { MoneyCell } from '../common/MoneyCell';
import { PanelSection } from '../common/PanelSection';
import { TableScroll } from '../common/TableScroll';
import { TraceDisclosure } from '../common/TraceDisclosure';

export interface PaymentsCalendarProps {
  readonly plan: Plan;
}

/** The default split as readers say it ("30% / 40% / 30%"), read from the playbook table. */
const DEFAULT_SPLIT = DEFAULT_PAYMENT_SCHEDULE.map((milestone) => `${milestone.pct}%`).join(' / ');

export function PaymentsCalendar({ plan }: PaymentsCalendarProps): ReactElement {
  const { payments } = plan;
  return (
    <PanelSection
      id="money-payments"
      title="Cash needed each month"
      lede="Advances on booking, a second payment a month before, the balance on the day or on delivery."
    >
      {payments.assumption ? (
        <p className="payments__assumption">
          <span className="badge badge--assumption">{ASSUMPTION_BADGE}</span> No industry-standard
          schedule exists; {DEFAULT_SPLIT} is our starting point. Agree the real terms in writing.
        </p>
      ) : null}
      {payments.cashflow.length === 0 ? (
        <p>Payments are dated once the event has a date.</p>
      ) : (
        <TableScroll label="Cash needed by month">
          <table className="data-table">
            <caption>Cash needed by month</caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col" className="num">
                  Amount
                </th>
                <th scope="col">Paid to</th>
              </tr>
            </thead>
            <tbody>
              {payments.cashflow.map((month) => (
                <tr key={month.monthIso}>
                  <th scope="row">{formatMonthKey(month.monthIso)}</th>
                  <td className="num">
                    <MoneyCell amount={month.amountInr} />
                  </td>
                  <td>{month.vendorTypes.map((type) => VENDOR_PROFILES[type].label).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      )}
      <h4 className="payments__checklist-title">For every payment</h4>
      <ul className="payments__checklist">
        {payments.checklist.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <TraceDisclosure plan={plan} traceIds={payments.traceIds} subject="Payment schedule" />
    </PanelSection>
  );
}
