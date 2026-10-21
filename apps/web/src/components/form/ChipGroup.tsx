/**
 * A multi-select rendered as tappable chips (real checkboxes underneath).
 *
 * Responsibility: pick several options from a closed list, with an optional maximum (top
 * three priorities, five styles). At the maximum, unticked chips say so with aria-disabled
 * instead of disappearing or being disabled, and the reason is in the hint. Boundary:
 * controlled; the selection order is kept, since priorities are ranked.
 */
import type { ReactElement } from 'react';

export interface ChipOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

export interface ChipGroupProps<T extends string> {
  /** Prefix for the checkbox ids; unique on the page. */
  readonly name: string;
  readonly options: readonly ChipOption<T>[];
  readonly selected: readonly T[];
  readonly onChange: (next: T[]) => void;
  readonly max?: number;
}

export function ChipGroup<T extends string>({
  name,
  options,
  selected,
  onChange,
  max,
}: ChipGroupProps<T>): ReactElement {
  const full = max !== undefined && selected.length >= max;

  function toggle(value: T): void {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
      return;
    }
    // At the maximum a tick is ignored; the hint tells the reader to untick one first.
    if (!full) onChange([...selected, value]);
  }

  return (
    <div className="chips">
      {options.map((option) => {
        const checked = selected.includes(option.value);
        const blocked = full && !checked;
        return (
          <label key={option.value} className="chip-option">
            <input
              type="checkbox"
              id={`${name}-${option.value}`}
              name={name}
              value={option.value}
              checked={checked}
              aria-disabled={blocked}
              onChange={() => toggle(option.value)}
            />
            <span className="chip-option__label">{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}
