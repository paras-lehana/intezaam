/**
 * "What if a vendor cancels?" — re-booking time and money at stake, from the plan.
 *
 * Responsibility: pick a vendor and how many days before the event they cancel; compare
 * those days with the vendor's usual booking lead, and add up what the payment schedule
 * would have paid by then. Boundary: advice only — a cancellation is not a plan change, so
 * there is nothing to apply; amounts are the plan's estimates, not quotes.
 */
import { type ReactElement, useState } from 'react';
import type { Plan } from '@intezaam/core/schemas';
import { MoneyCell } from '../common/MoneyCell';
import { formatIsoDate } from '../common/dates';
import { LabelledSelect } from '../people/LabelledSelect';
import { CANCEL_DAYS_OPTIONS, cancelImpact } from './vendor-cancel';

export interface VendorCancelNoteProps {
  readonly plan: Plan;
}

const DEFAULT_DAYS = 30;

export function VendorCancelNote({ plan }: VendorCancelNoteProps): ReactElement | null {
  const [vendorType, setVendorType] = useState(plan.vendors[0]?.vendorType);
  const [days, setDays] = useState<number>(DEFAULT_DAYS);
  if (vendorType === undefined) return null;
  const impact = cancelImpact(plan, vendorType, days);
  const vendorOptions = plan.vendors.map((entry) => ({
    value: entry.vendorType,
    label: entry.label,
  }));
  return (
    <div className="whatif-cancel">
      <h4>What if a vendor cancels?</h4>
      <div className="whatif-cancel__pickers">
        <LabelledSelect
          id="whatif-cancel-vendor"
          label="Vendor"
          value={vendorType}
          options={vendorOptions}
          onChange={(value) =>
            setVendorType(
              vendorOptions.find((option) => option.value === value)?.value ?? vendorType,
            )
          }
        />
        <LabelledSelect
          id="whatif-cancel-days"
          label="Cancels this long before"
          value={String(days)}
          options={CANCEL_DAYS_OPTIONS.map((value) => ({
            value: String(value),
            label: `${value} days`,
          }))}
          onChange={(value) =>
            setDays(CANCEL_DAYS_OPTIONS.find((option) => String(option) === value) ?? days)
          }
        />
      </div>
      {impact === null ? null : (
        <p aria-live="polite">
          {impact.vendor.label} is usually booked about {impact.usualLeadDays} days ahead.{' '}
          {impact.shortNotice
            ? `With ${days} days left, expect fewer choices and higher prices — line up a back-up now.`
            : `${days} days is enough to re-book in the usual way.`}{' '}
          {impact.paidByThenInr === null || impact.cancelIso === null ? (
            'Fix a date to see the money at stake.'
          ) : (
            <>
              By {formatIsoDate(impact.cancelIso)} the schedule would have paid{' '}
              <MoneyCell amount={impact.paidByThenInr} /> — check the refund terms in the contract.
            </>
          )}
        </p>
      )}
    </div>
  );
}
