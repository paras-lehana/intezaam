/**
 * A radio group rendered as tappable chips or option cards.
 *
 * Responsibility: one accessible single-choice control — native radios in a fieldset with
 * a legend, so arrow keys and screen readers work without custom ARIA — with an optional
 * hint and an inline error tied to the group by aria-describedby. Boundary: controlled;
 * the parent owns the value (`''` means nothing chosen yet, as on an empty form).
 */
import type { ReactElement } from 'react';

export interface ChoiceOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly hint?: string;
}

export interface ChoiceGroupProps<T extends string> {
  readonly legend: string;
  /** The radios' shared `name`; unique on the page. Also the prefix for element ids. */
  readonly name: string;
  readonly options: readonly ChoiceOption<T>[];
  readonly value: T | '';
  readonly onChange: (value: T) => void;
  readonly hint?: string;
  readonly error?: string | undefined;
  /** `chips` for short labels in a wrapping row; `cards` for options with a hint line. */
  readonly variant?: 'chips' | 'cards';
  readonly className?: string;
}

/**
 * Space-separated ids of the hint and error, or undefined when there are none.
 * @example
 * describedBy('family', true, false); // 'family-hint'
 */
export function describedBy(
  prefix: string,
  hasHint: boolean,
  hasError: boolean,
): string | undefined {
  const ids = [hasHint ? `${prefix}-hint` : null, hasError ? `${prefix}-error` : null].filter(
    (id): id is string => id !== null,
  );
  return ids.length === 0 ? undefined : ids.join(' ');
}

export function ChoiceGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  hint,
  error,
  variant = 'cards',
  className,
}: ChoiceGroupProps<T>): ReactElement {
  const classes = ['choice-group', `choice-group--${variant}`, className].filter(Boolean).join(' ');
  return (
    <fieldset
      className={classes}
      aria-describedby={describedBy(name, hint !== undefined, error !== undefined)}
    >
      <legend className="choice-group__legend">{legend}</legend>
      {hint === undefined ? null : (
        <p id={`${name}-hint`} className="field__hint">
          {hint}
        </p>
      )}
      <div className="choice-group__options">
        {options.map((option) => (
          <label key={option.value} className="choice">
            <input
              type="radio"
              id={`${name}-${option.value}`}
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            <span className="choice__label">{option.label}</span>
            {option.hint === undefined ? null : <span className="choice__hint">{option.hint}</span>}
          </label>
        ))}
      </div>
      {error === undefined ? null : (
        <p id={`${name}-error`} className="field__error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
