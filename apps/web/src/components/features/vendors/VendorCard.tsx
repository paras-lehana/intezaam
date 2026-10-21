/**
 * One vendor to book: when, for how much, where it stands, and the full checklist.
 *
 * Responsibility: the summary a family scans (book-by date, budget line, GST rate, status
 * select kept on this device), a "Find near <city>" Google Maps search (no vendor names,
 * VEN-05), a disclosure for the checklist and payments, the enquiry drafter and "Why this?".
 * Boundary: display and local status only; the engine chose the vendor types and dates.
 */
import { type ReactElement, useId, useState } from 'react';
import type { EventContext, Plan, VendorChecklist as VendorData } from '@intezaam/core/schemas';
import { formatIsoDate } from '../common/dates';
import { MoneyCell } from '../common/MoneyCell';
import { TraceDisclosure } from '../common/TraceDisclosure';
import { formatGstRate } from '../money/money-format';
import { EnquiryDraft } from './EnquiryDraft';
import { VendorStatusSelect } from './VendorStatusSelect';
import type { VendorStatus } from './vendor-status';
import { VendorChecklist } from './VendorChecklist';

export interface VendorCardProps {
  readonly plan: Plan;
  readonly vendor: VendorData;
  readonly context: EventContext;
  readonly todayIso: string;
  readonly hinglish?: boolean | undefined;
  readonly status: VendorStatus;
  readonly onStatusChange: (status: VendorStatus) => void;
}

export function VendorCard({
  plan,
  vendor,
  context,
  todayIso,
  hinglish,
  status,
  onStatusChange,
}: VendorCardProps): ReactElement {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  return (
    <li className="vendor card" data-status={status}>
      <h3 className="vendor__title">{vendor.label}</h3>
      <p className="vendor__facts">
        {vendor.bookByIso === undefined
          ? 'Book once the date is fixed'
          : `Book by ${formatIsoDate(vendor.bookByIso)}`}
        {vendor.budgetInr === undefined ? null : (
          <>
            {' '}
            · budget <MoneyCell amount={vendor.budgetInr} />
          </>
        )}{' '}
        · GST {formatGstRate(vendor.gstPct)}
      </p>
      <VendorStatusSelect
        id={`${detailsId}-status`}
        vendorLabel={vendor.label}
        value={status}
        onChange={onStatusChange}
      />
      <div className="vendor__actions">
        <button
          type="button"
          className="button button--ghost"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen(!open)}
        >
          {open ? 'Hide checklist' : 'Show checklist'}{' '}
          <span className="visually-hidden">for {vendor.label}</span>
        </button>
        <a
          className="button button--ghost"
          href={vendor.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Find near {plan.contextEcho.cityName}
          <span className="visually-hidden">
            : {vendor.label} on Google Maps (opens in a new tab)
          </span>
        </a>
      </div>
      <div id={detailsId} hidden={!open}>
        {/* Efficiency: a plan can list 20+ vendors; each checklist renders only when opened. */}
        {open ? <VendorChecklist vendor={vendor} /> : null}
      </div>
      <EnquiryDraft
        context={context}
        todayIso={todayIso}
        vendorType={vendor.vendorType}
        vendorLabel={vendor.label}
        hinglish={hinglish}
      />
      <TraceDisclosure plan={plan} traceIds={vendor.traceIds} subject={vendor.label} />
    </li>
  );
}
