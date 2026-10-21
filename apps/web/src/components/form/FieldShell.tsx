/**
 * One labelled form field: label, control, hint and inline error.
 *
 * Responsibility: wire the label (htmlFor), the hint and the error to the control
 * (aria-describedby, aria-invalid) the same way everywhere, and carry the glow class when
 * validation sends the reader here. Boundary: the control itself comes from the caller
 * through a render prop that receives the accessibility attributes to spread.
 */
import type { ReactElement, ReactNode } from 'react';
import { describedBy } from '../ui/ChoiceGroup';
import { type FieldKey, plannerFieldId } from './form-fields';

export interface InputA11y {
  readonly id: string;
  readonly 'aria-invalid': boolean;
  readonly 'aria-describedby'?: string;
}

export interface FieldShellProps {
  readonly inputId: string;
  readonly label: string;
  readonly renderControl: (a11y: InputA11y) => ReactNode;
  /** Set on the field that owns errors of this key (wrapper id + glow); omit inside a group. */
  readonly field?: FieldKey;
  readonly hint?: string | undefined;
  readonly error?: string | undefined;
  readonly attention?: boolean;
  readonly className?: string;
}

export function FieldShell({
  inputId,
  label,
  renderControl,
  field,
  hint,
  error,
  attention = false,
  className,
}: FieldShellProps): ReactElement {
  const describedIds = describedBy(inputId, hint !== undefined, error !== undefined);
  const invalid = error !== undefined;
  const a11y: InputA11y =
    describedIds === undefined
      ? { id: inputId, 'aria-invalid': invalid }
      : { id: inputId, 'aria-invalid': invalid, 'aria-describedby': describedIds };
  const classes = ['field', attention ? 'field--attention' : null, className].filter(Boolean);
  return (
    <div id={field === undefined ? undefined : plannerFieldId(field)} className={classes.join(' ')}>
      <label htmlFor={inputId}>{label}</label>
      {renderControl(a11y)}
      {hint === undefined ? null : (
        <p id={`${inputId}-hint`} className="field__hint">
          {hint}
        </p>
      )}
      {error === undefined ? null : (
        <p id={`${inputId}-error`} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
}
