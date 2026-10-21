/**
 * Adds one row to the committee ledger: a label, collected or spent, and the amount.
 *
 * Responsibility: a small labelled form with an inline error when the label or amount is
 * missing (role="alert"; the button is never disabled). Boundary: hands the row to the
 * ledger; ids come from the caller so they stay unique within the session.
 */
import { type FormEvent, type ReactElement, useState } from 'react';
import { MAX_LABEL_CHARS } from '@intezaam/core/schemas';
import { readWhole } from './chanda';
import { LEDGER_KIND_LABELS, type LedgerKind, type LedgerRow } from './ledger';
import { WholeField } from './WholeField';

export interface LedgerAddFormProps {
  readonly nextId: () => string;
  readonly onAdd: (row: LedgerRow) => void;
}

const KINDS: readonly LedgerKind[] = ['collected', 'spent'];

export function LedgerAddForm({ nextId, onAdd }: LedgerAddFormProps): ReactElement {
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<LedgerKind>('collected');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = label.trim();
    if (trimmed === '' || readWhole(amount) === undefined) {
      setError('Add what the money is for and the amount.');
      return;
    }
    onAdd({ id: nextId(), label: trimmed, kind, actual: amount });
    setLabel('');
    setAmount('');
    setError('');
  }

  return (
    <form className="ledger-add" noValidate onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="ledger-label">What for</label>
        <input
          id="ledger-label"
          type="text"
          value={label}
          maxLength={MAX_LABEL_CHARS}
          placeholder="Flat 12B contribution"
          onChange={(event) => setLabel(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="ledger-kind">Collected or spent</label>
        <select
          id="ledger-kind"
          value={kind}
          onChange={(event) => setKind(event.target.value === 'spent' ? 'spent' : 'collected')}
        >
          {KINDS.map((option) => (
            <option key={option} value={option}>
              {LEDGER_KIND_LABELS[option]}
            </option>
          ))}
        </select>
      </div>
      <WholeField id="ledger-amount" label="Amount (₹)" value={amount} onChange={setAmount} />
      <button type="submit" className="button button--secondary">
        Add to the ledger
      </button>
      {error === '' ? null : (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
