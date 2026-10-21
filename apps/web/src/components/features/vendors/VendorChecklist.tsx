/**
 * What to ask, what to get in writing, what should worry you, and when to pay.
 *
 * Responsibility: the body of one vendor's checklist (VEN-03/04) — three titled lists and
 * the payment schedule with amounts from the budget line and due dates from the event
 * date. Boundary: display only; the playbook text is core's "planner checklist".
 */
import type { ReactElement } from 'react';
import type { PaymentDueRule } from '@intezaam/core/domain';
import type { VendorChecklist as VendorChecklistData } from '@intezaam/core/schemas';
import { formatIsoDate } from '../common/dates';
import { MoneyCell } from '../common/MoneyCell';
import { TableScroll } from '../common/TableScroll';

export interface VendorChecklistProps {
  readonly vendor: VendorChecklistData;
}

interface ChecklistList {
  readonly key: 'questions' | 'getInWriting' | 'redFlags';
  readonly title: string;
}

/** When a payment falls due if the plan has no date for it yet. */
export const DUE_LABELS: Readonly<Record<PaymentDueRule, string>> = {
  'on-booking': 'On booking',
  'event-minus-30': 'A month before',
  'event-day': 'On the day',
  'on-delivery': 'On delivery',
};

const LISTS: readonly ChecklistList[] = [
  { key: 'questions', title: 'Questions to ask' },
  { key: 'getInWriting', title: 'Get it in writing' },
  { key: 'redFlags', title: 'Red flags' },
];

export function VendorChecklist({ vendor }: VendorChecklistProps): ReactElement {
  return (
    <div className="vendor-checklist">
      {LISTS.map((list) =>
        vendor[list.key].length === 0 ? null : (
          <div
            key={list.key}
            className={`vendor-checklist__list vendor-checklist__list--${list.key}`}
          >
            <h4>{list.title}</h4>
            <ul>
              {vendor[list.key].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ),
      )}
      {vendor.payments.length === 0 ? null : (
        <TableScroll label={`Payment schedule for ${vendor.label}`}>
          <table className="data-table">
            <caption>Payment schedule for {vendor.label}</caption>
            <thead>
              <tr>
                <th scope="col">Payment</th>
                <th scope="col" className="num">
                  Share
                </th>
                <th scope="col" className="num">
                  Amount
                </th>
                <th scope="col">Due</th>
              </tr>
            </thead>
            <tbody>
              {vendor.payments.map((payment) => (
                <tr key={payment.key}>
                  <th scope="row">{payment.label}</th>
                  <td className="num">{payment.pct}%</td>
                  <td className="num">
                    <MoneyCell amount={payment.amountInr} />
                  </td>
                  <td>
                    {payment.dueIso === undefined
                      ? DUE_LABELS[payment.due]
                      : formatIsoDate(payment.dueIso)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      )}
    </div>
  );
}
