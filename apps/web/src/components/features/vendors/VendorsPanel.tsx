/**
 * Vendors: who to book, by when, what to ask, how to pay — and the quote comparison.
 *
 * Responsibility: compose the vendors tab — one card per needed vendor type in booking
 * order (VEN-01/02), each with its status kept on this device so a re-plan never resets
 * it, then the quote reader. Boundary: loaded lazily the first time the tab opens; no
 * vendor is ever named or recommended (VEN-05).
 */
import { type ReactElement, useState } from 'react';
import type { VendorType } from '@intezaam/core/domain';
import { PanelHeader } from '../common/PanelHeader';
import type { PanelProps } from '../panel-props';
import { QuoteReader } from './QuoteReader';
import { type VendorStatus, readVendorStatuses, storeVendorStatuses } from './vendor-status';
import { VendorCard } from './VendorCard';
import './vendors.css';

export function VendorsPanel({ plan, context, todayIso, hinglish }: PanelProps): ReactElement {
  const [statuses, setStatuses] = useState(readVendorStatuses);

  function changeStatus(vendorType: VendorType, status: VendorStatus): void {
    const next = { ...statuses, [vendorType]: status };
    setStatuses(next);
    storeVendorStatuses(next);
  }

  return (
    <div className="panel vendors">
      <PanelHeader title="Vendors">
        {plan.vendors.length} vendors to book, earliest first, each with questions, red flags and a
        payment plan. Search near {plan.contextEcho.cityName} on Google Maps — we never name or rank
        vendors.
      </PanelHeader>
      <ul className="plain-list vendor-list" role="list">
        {plan.vendors.map((vendor) => (
          <VendorCard
            key={vendor.vendorType}
            plan={plan}
            vendor={vendor}
            context={context}
            todayIso={todayIso}
            hinglish={hinglish}
            status={statuses[vendor.vendorType] ?? vendor.status}
            onStatusChange={(status) => changeStatus(vendor.vendorType, status)}
          />
        ))}
      </ul>
      <QuoteReader plan={plan} context={context} todayIso={todayIso} />
    </div>
  );
}
