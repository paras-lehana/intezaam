/**
 * The spend tracker: planned, committed and paid per budget line, on this device only.
 *
 * Responsibility: let the family record what they have agreed and paid against each line,
 * warn at 90% and flag an overrun — per line and in total — and remember the amounts on
 * this device between visits. Boundary: never sent to the server or the AI; a re-plan keeps
 * the typed amounts because they are keyed by category.
 */
import { type ReactElement, useState } from 'react';
import type { BudgetCategory } from '@intezaam/core/domain';
import type { Plan } from '@intezaam/core/schemas';
import { MoneyCell } from '../common/MoneyCell';
import { PanelSection } from '../common/PanelSection';
import { TableScroll } from '../common/TableScroll';
import {
  type SpendBook,
  type SpendEntry,
  readSpendBook,
  spendStatus,
  spentOf,
  storeSpendBook,
} from './spend-tracker';
import { SpendRow } from './SpendRow';
import { SpendStatusLabel } from './SpendStatusLabel';

export interface SpendTrackerProps {
  readonly plan: Plan;
}

export function SpendTracker({ plan }: SpendTrackerProps): ReactElement {
  const [book, setBook] = useState<SpendBook>(readSpendBook);
  const { lines, totalInr } = plan.budget;
  const spent = lines.reduce((sum, line) => sum + spentOf(book[line.category]), 0);

  function update(category: BudgetCategory, entry: SpendEntry): void {
    const next: SpendBook = { ...book, [category]: entry };
    setBook(next);
    storeSpendBook(next);
  }

  return (
    <PanelSection
      id="money-tracker"
      title="Spend tracker"
      lede="Type what you have agreed and paid. It stays on this device and is never sent anywhere."
    >
      <TableScroll label="Planned, committed and paid by category">
        <table className="data-table spend-table">
          <caption>Planned, committed and paid by category</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col" className="num">
                Planned
              </th>
              <th scope="col">Committed (₹)</th>
              <th scope="col">Paid (₹)</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <SpendRow
                key={line.category}
                line={line}
                entry={book[line.category]}
                onChange={(entry) => update(line.category, entry)}
              />
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td className="num">
                <MoneyCell amount={totalInr} />
              </td>
              <td colSpan={2}>
                Used so far: <MoneyCell amount={spent} />
              </td>
              <td>
                <SpendStatusLabel status={spendStatus(totalInr, spent)} />
              </td>
            </tr>
          </tfoot>
        </table>
      </TableScroll>
    </PanelSection>
  );
}
