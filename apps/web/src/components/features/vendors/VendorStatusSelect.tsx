/**
 * A labelled select for where a vendor stands: to contact, quote received, booked, paid.
 *
 * Responsibility: a native select (keyboard and screen readers work without custom ARIA)
 * whose label names the vendor. Boundary: controlled; the panel keeps the choice.
 */
import type { ReactElement } from 'react';
import { VENDOR_STATUSES } from '@intezaam/core/schemas';
import { VENDOR_STATUS_LABELS, type VendorStatus, asVendorStatus } from './vendor-status';

export interface VendorStatusSelectProps {
  readonly id: string;
  readonly vendorLabel: string;
  readonly value: VendorStatus;
  readonly onChange: (status: VendorStatus) => void;
}

export function VendorStatusSelect({
  id,
  vendorLabel,
  value,
  onChange,
}: VendorStatusSelectProps): ReactElement {
  return (
    <div className="vendor-status">
      <label htmlFor={id}>
        Status <span className="visually-hidden">of the {vendorLabel}</span>
      </label>
      <select
        id={id}
        className="vendor-status__select"
        value={value}
        onChange={(event) => {
          const next = asVendorStatus(event.target.value);
          if (next !== undefined) onChange(next);
        }}
      >
        {VENDOR_STATUSES.map((status) => (
          <option key={status} value={status}>
            {VENDOR_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
    </div>
  );
}
