/**
 * A labelled whole-number input (guests, days, rupees, square feet).
 *
 * Responsibility: one consistent numeric control — a text input with the numeric keypad,
 * so "25,00,000" or "₹40,000" can be typed as people write them and validation (not the
 * browser) decides what is valid. Boundary: keeps the text as typed; form-context.ts
 * parses it.
 */
import type { ReactElement } from 'react';
import { FieldShell } from './FieldShell';
import type { FieldKey } from './form-fields';

export interface NumberFieldProps {
  readonly inputId: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly field?: FieldKey;
  readonly hint?: string | undefined;
  readonly error?: string | undefined;
  readonly attention?: boolean;
  readonly placeholder?: string;
}

export function NumberField({
  inputId,
  label,
  value,
  onChange,
  field,
  hint,
  error,
  attention = false,
  placeholder,
}: NumberFieldProps): ReactElement {
  return (
    <FieldShell
      inputId={inputId}
      label={label}
      hint={hint}
      error={error}
      attention={attention}
      {...(field === undefined ? {} : { field })}
      renderControl={(a11y) => (
        <input
          {...a11y}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    />
  );
}
