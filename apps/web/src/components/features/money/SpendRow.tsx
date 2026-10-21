/**
 * One budget line in the spend tracker: planned, committed, paid and its status.
 *
 * Responsibility: two labelled amount boxes (the labels are visually hidden but name the
 * category, so each box is unambiguous to assistive technology) and the line's status in
 * words plus a shape. Boundary: the tracker owns the stored amounts.
 */
import type { ReactElement } from 'react';
import type { BudgetLine } from '@intezaam/core/schemas';
import { MoneyCell } from '../common/MoneyCell';
import { MAX_AMOUNT_CHARS, type SpendEntry, spendStatus, spentOf } from './spend-tracker';
import { SpendStatusLabel } from './SpendStatusLabel';

export interface SpendRowProps {
  readonly line: BudgetLine;
  readonly entry: SpendEntry | undefined;
  readonly onChange: (entry: SpendEntry) => void;
}

const FIELDS = ['committed', 'paid'] as const;

const FIELD_LABELS: Readonly<Record<(typeof FIELDS)[number], string>> = {
  committed: 'Committed',
  paid: 'Paid',
};

export function SpendRow({ line, entry, onChange }: SpendRowProps): ReactElement {
  const current: SpendEntry = entry ?? { committed: '', paid: '' };
  return (
    <tr>
      <th scope="row">{line.label}</th>
      <td className="num">
        <MoneyCell amount={line.amountInr} />
      </td>
      {FIELDS.map((field) => {
        const id = `spend-${line.category}-${field}`;
        return (
          <td key={field}>
            <label className="visually-hidden" htmlFor={id}>
              {FIELD_LABELS[field]} for {line.label} (₹)
            </label>
            <input
              id={id}
              className="spend-input"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={MAX_AMOUNT_CHARS}
              value={current[field]}
              onChange={(event) => onChange({ ...current, [field]: event.target.value })}
            />
          </td>
        );
      })}
      <td>
        <SpendStatusLabel status={spendStatus(line.amountInr, spentOf(entry))} />
      </td>
    </tr>
  );
}
