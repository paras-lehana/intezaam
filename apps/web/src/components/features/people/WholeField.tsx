/**
 * A labelled whole-number field for the People tools (floor area, households, rupees).
 *
 * Responsibility: a text input with the numeric keypad, so "₹60,000" or "3,000 sq ft" can
 * be typed the way people write them; the shared FieldShell wires the label and hint.
 * Boundary: controlled and unparsed — callers read the digits with `readWhole`.
 */
import type { ReactElement } from 'react';
import { FieldShell } from '../../form/FieldShell';

export interface WholeFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly hint?: string;
}

export function WholeField({ id, label, value, onChange, hint }: WholeFieldProps): ReactElement {
  return (
    <FieldShell
      inputId={id}
      label={label}
      hint={hint}
      renderControl={(a11y) => (
        <input
          {...a11y}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    />
  );
}
