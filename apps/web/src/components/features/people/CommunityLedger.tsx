/**
 * The committee ledger (feature #32, COM-03): collected vs spent, against the plan.
 *
 * Responsibility: one row per expected collection and budget head (planned amount from the
 * plan, actual amount typed by the treasurer), rows the committee adds, totals, the balance
 * (surplus or deficit) and a CSV download for Google Sheets. Boundary: kept in this browser
 * tab only — nothing is uploaded; download the CSV to keep a copy.
 */
import { type ReactElement, useMemo, useRef, useState } from 'react';
import { formatInr } from '@intezaam/core';
import type { CommunityPlan } from '@intezaam/core/schemas';
import { MoneyCell } from '../common/MoneyCell';
import { PanelSection } from '../common/PanelSection';
import { TableScroll } from '../common/TableScroll';
import { downloadText, fileSlug } from '../share/download';
import {
  LEDGER_KIND_LABELS,
  type LedgerRow,
  ledgerToCsv,
  ledgerTotals,
  seedLedger,
} from './ledger';
import { LedgerAddForm } from './LedgerAddForm';

export interface CommunityLedgerProps {
  readonly community: CommunityPlan;
  readonly title: string;
}

export function CommunityLedger({ community, title }: CommunityLedgerProps): ReactElement {
  const [rows, setRows] = useState<readonly LedgerRow[]>(() => seedLedger(community));
  const added = useRef(0);
  // Efficiency: totals are summed once per edit, not on every render.
  const totals = useMemo(() => ledgerTotals(rows), [rows]);

  function setActual(id: string, actual: string): void {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, actual } : row)));
  }

  function nextId(): string {
    added.current += 1;
    return `added-${added.current}`;
  }

  const balanceWord = totals.balanceInr >= 0 ? 'Surplus' : 'Deficit';
  return (
    <PanelSection
      id="people-ledger"
      title="Ledger: collected and spent"
      lede="Kept in this browser only. Download it to keep a copy or share it with the committee."
    >
      <TableScroll label="Ledger rows">
        <table className="people-table">
          <caption className="visually-hidden">Ledger rows</caption>
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Type</th>
              <th scope="col">Planned</th>
              <th scope="col">Actual (₹)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <th scope="row">{row.label}</th>
                <td>{LEDGER_KIND_LABELS[row.kind]}</td>
                <td>
                  {row.plannedInr === undefined ? '—' : <MoneyCell amount={row.plannedInr} />}
                </td>
                <td>
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label={`Actual amount, ${row.label}`}
                    value={row.actual}
                    onChange={(event) => setActual(row.id, event.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
      <p aria-live="polite">
        Collected {formatInr(totals.collectedInr)} of {formatInr(totals.plannedCollectedInr)}{' '}
        planned · spent {formatInr(totals.spentInr)} of {formatInr(totals.plannedSpentInr)} planned
        ·{' '}
        <strong>
          {balanceWord} {formatInr(Math.abs(totals.balanceInr))}
        </strong>
      </p>
      <LedgerAddForm nextId={nextId} onAdd={(row) => setRows((current) => [...current, row])} />
      <button
        type="button"
        className="button button--secondary"
        onClick={() => downloadText(`${fileSlug(title)}-ledger.csv`, ledgerToCsv(rows), 'csv')}
      >
        Download the ledger (CSV)
      </button>
    </PanelSection>
  );
}
