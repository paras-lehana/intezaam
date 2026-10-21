/**
 * Responsibility: the Vendors tab renders its plan section — one card per vendor type with
 * the book-by date, a "Find near <city>" Google Maps search (never a named vendor), a
 * checklist disclosure with questions, red flags and the payment schedule, and a status
 * select remembered on this device. Boundary: vendors come from an engine-built plan; the
 * drafting and quote flows have their own suites.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { formatIsoDate } from '../../../components/features/common/dates';
import {
  VENDOR_STATUS_LABELS,
  VENDOR_STATUS_STORAGE_KEY,
  readVendorStatuses,
} from '../../../components/features/vendors/vendor-status';
import { VendorsPanel } from '../../../components/features/vendors/VendorsPanel';
import { panelProps } from '../plan-fixtures';

const props = panelProps('bengaluru-birthday');
const { plan } = props;
const [vendor] = plan.vendors;
const label = vendor?.label ?? '';

function card(name: string): HTMLElement {
  const heading = screen.getByRole('heading', { level: 3, name });
  return heading.closest('li') ?? document.body;
}

describe('VendorsPanel', () => {
  it('shows one card per vendor type, in the plan’s order', () => {
    render(<VendorsPanel {...props} />);
    const titles = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)
      .filter((title) => plan.vendors.some((item) => item.label === title));
    expect(titles).toEqual(plan.vendors.map((item) => item.label));
  });

  it('gives the book-by date and a Google Maps search near the city', () => {
    render(<VendorsPanel {...props} />);
    const scope = within(card(label));
    expect(vendor?.bookByIso).toBeDefined();
    expect(
      scope.getByText(`Book by ${formatIsoDate(vendor?.bookByIso ?? '')}`, { exact: false }),
    ).toBeInTheDocument();
    const maps = scope.getByRole('link', {
      name: new RegExp(`^Find near ${plan.contextEcho.cityName}`),
    });
    expect(maps).toHaveAttribute('href', vendor?.mapsUrl);
    expect(maps).toHaveAttribute('target', '_blank');
  });

  it('opens the checklist with questions, red flags and the payment schedule', async () => {
    const user = userEvent.setup();
    render(<VendorsPanel {...props} />);
    const scope = within(card(label));
    const toggle = scope.getByRole('button', { name: `Show checklist for ${label}` });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(scope.getByRole('button', { name: `Hide checklist for ${label}` })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    for (const question of vendor?.questions ?? []) {
      expect(scope.getByText(question)).toBeInTheDocument();
    }
    for (const flag of vendor?.redFlags ?? []) {
      expect(scope.getByText(flag)).toBeInTheDocument();
    }
    expect(vendor?.payments.length).toBeGreaterThan(0);
    expect(scope.getByRole('table', { name: `Payment schedule for ${label}` })).toBeInTheDocument();
  });

  it('remembers a vendor’s status on this device', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<VendorsPanel {...props} />);
    const select = within(card(label)).getByRole('combobox', { name: `Status of the ${label}` });
    await user.selectOptions(select, VENDOR_STATUS_LABELS.booked);
    expect(readVendorStatuses()).toEqual({ [vendor?.vendorType ?? '']: 'booked' });
    unmount();
    render(<VendorsPanel {...props} />);
    expect(
      within(card(label)).getByRole('combobox', { name: `Status of the ${label}` }),
    ).toHaveValue('booked');
  });

  it('ignores tampered status storage', () => {
    window.localStorage.setItem(VENDOR_STATUS_STORAGE_KEY, '{"venue":"hired"}');
    expect(readVendorStatuses()).toEqual({});
    window.localStorage.setItem(VENDOR_STATUS_STORAGE_KEY, 'not json');
    expect(readVendorStatuses()).toEqual({});
  });
});
