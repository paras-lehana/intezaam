/**
 * Guest list (feature #28): optional and browser-only.
 *
 * Responsibility: add parties by hand or import a CSV (Google Contacts or a spreadsheet,
 * Hinglish words understood), see people-not-rows totals, change RSVPs, export a
 * formula-safe CSV for Google Sheets, and clear the list — a removal or a clear is announced
 * politely and focus stays in the section. Boundary: guest names never leave this device —
 * not to the server, not to the AI; only a head count can update the plan.
 */
import { type ReactElement, useState } from 'react';
import { flushSync } from 'react-dom';
import type { ContextPatch, Plan } from '@intezaam/core/schemas';
import { LiveRegion } from '../../ui/LiveRegion';
import { PanelSection } from '../common/PanelSection';
import { downloadText, fileSlug } from '../share/download';
import { guestsToCsv } from './guest-csv';
import { GUEST_NAME_ID, GuestAddForm } from './GuestAddForm';
import { GuestImport } from './GuestImport';
import { GuestTable } from './GuestTable';
import { GuestTotals } from './GuestTotals';
import type { Guest } from './guest-rules';
import { useGuestList } from './use-guest-list';

export interface GuestListProps {
  readonly plan: Plan;
  readonly plannedGuests: number;
  readonly onApplyPatch: (patch: ContextPatch) => void;
}

export const CLEARED = 'Cleared the guest list.';

export function GuestList({ plan, plannedGuests, onApplyPatch }: GuestListProps): ReactElement {
  const list = useGuestList();
  const [announcement, setAnnouncement] = useState('');
  const withSides = plan.contextEcho.family === 'wedding';

  function remove(guest: Guest): void {
    list.remove(guest.id);
    setAnnouncement(`Removed ${guest.name}.`);
  }

  function clear(): void {
    // The whole table and this button go away; the name box keeps the reader in the section.
    flushSync(list.clear);
    setAnnouncement(CLEARED);
    document.getElementById(GUEST_NAME_ID)?.focus();
  }

  return (
    <PanelSection
      id="people-guests"
      title="Guest list"
      lede="Optional. The list stays on this device — it is never sent to our server or to the AI."
    >
      <GuestAddForm withSides={withSides} onAdd={list.add} />
      <GuestImport nextBatch={list.nextBatch} onImport={list.addMany} />
      {list.guests.length === 0 ? null : (
        <>
          <GuestTotals
            counts={list.counts}
            plannedGuests={plannedGuests}
            withSides={withSides}
            onApplyPatch={onApplyPatch}
          />
          <GuestTable
            guests={list.guests}
            withSides={withSides}
            onStatus={list.setStatus}
            onRemove={remove}
          />
          <div className="people-actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={() =>
                downloadText(`${fileSlug(plan.title)}-guests.csv`, guestsToCsv(list.guests), 'csv')
              }
            >
              Download the list (CSV for Google Sheets)
            </button>
            <button type="button" className="button button--ghost" onClick={clear}>
              Clear the list
            </button>
          </div>
        </>
      )}
      <LiveRegion message={announcement} />
    </PanelSection>
  );
}
