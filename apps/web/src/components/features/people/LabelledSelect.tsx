/**
 * A labelled native select (guest-list pickers, the message studio's kind and language).
 *
 * Responsibility: one select with a visible label, so every picker reads and behaves the
 * same with a keyboard or a screen reader. Boundary: controlled; values are strings and the
 * caller narrows them to its typed options (pickOption).
 */
import type { ReactElement } from 'react';

export interface LabelledSelectProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly options: readonly { readonly value: string; readonly label: string }[];
  readonly onChange: (value: string) => void;
}

export function LabelledSelect({
  id,
  label,
  value,
  options,
  onChange,
}: LabelledSelectProps): ReactElement {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
