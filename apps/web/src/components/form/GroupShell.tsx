/**
 * A titled group of related controls (a fieldset with a legend), with one inline error.
 *
 * Responsibility: the hint / error / glow wiring that FieldShell has, for fields made of
 * several controls (functions, priorities, community details). Boundary: layout of the
 * controls inside is the caller's.
 */
import type { ReactElement, ReactNode } from 'react';
import { describedBy } from '../ui/ChoiceGroup';
import { type FieldKey, plannerFieldId } from './form-fields';

export interface GroupShellProps {
  readonly field: FieldKey;
  readonly legend: string;
  readonly children: ReactNode;
  readonly hint?: string | undefined;
  readonly error?: string | undefined;
  readonly attention: boolean;
  readonly className?: string;
}

export function GroupShell({
  field,
  legend,
  children,
  hint,
  error,
  attention,
  className,
}: GroupShellProps): ReactElement {
  const id = plannerFieldId(field);
  const classes = ['group', attention ? 'field--attention' : null, className].filter(Boolean);
  return (
    <fieldset
      id={id}
      className={classes.join(' ')}
      aria-describedby={describedBy(id, hint !== undefined, error !== undefined)}
    >
      <legend className="group__legend">{legend}</legend>
      {hint === undefined ? null : (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      )}
      {children}
      {error === undefined ? null : (
        <p id={`${id}-error`} className="field__error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
