/**
 * Guest list (feature #28): optional and browser-only.
 *
 * Responsibility: add parties by hand or import a CSV (Google Contacts or a spreadsheet,
 * Hinglish words understood), see people-not-rows totals, change RSVPs, export a
 * formula-safe CSV for Google Sheets, and clear the list. Boundary: guest names never leave
 * this device — not to the server, not to the AI; only a head count can update the plan.
 */
import type { ReactElement } from 'react';
import type { ContextPatch, Plan } from '@intezaam/core/schemas';
import { PanelSection } from '../common/PanelSection';
import { downloadText, fileSlug } from '../share/download';
import { guestsToCsv } from './guest-csv';
import { GuestAddForm } from './GuestAddForm';
import { GuestImport } from './GuestImport';
import { GuestTable } from './GuestTable';
import { GuestTotals } from './GuestTotals';
import { useGuestList } from './use-guest-list';

export interface GuestListProps {
  readonly plan: Plan;
  readonly plannedGuests: number;
  readonly onApplyPatch: (patch: ContextPatch) => void;
}

export function GuestList({ plan, plannedGuests, onApplyPatch }: GuestListProps): ReactElement {
  const list = useGuestList();
  const withSides = plan.contextEcho.family === 'wedding';
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
            onRemove={list.remove}
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
            <button type="button" className="button button--ghost" onClick={list.clear}>
              Clear the list
            </button>
          </div>
        </>
      )}
    </PanelSection>
  );
}
