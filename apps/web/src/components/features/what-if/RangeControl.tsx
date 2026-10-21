/**
 * One labelled slider for the What-if tool, with its value spelled out beside it.
 *
 * Responsibility: a native range input (arrow keys, Page Up/Down, Home/End all work) with
 * a visible label, an `<output>` showing the value in words, and the same words as
 * aria-valuetext so a screen reader hears "250 guests (50 fewer)", not "250". Boundary:
 * controlled; the scenario owns the value.
 */
import type { ReactElement } from 'react';
import type { ControlRange } from './what-if-scenario';

export interface RangeControlProps {
  readonly id: string;
  readonly label: string;
  readonly range: ControlRange;
  readonly value: number;
  /** The value in words, e.g. "250 guests (50 fewer)". */
  readonly valueText: string;
  readonly onChange: (value: number) => void;
}

export function RangeControl({
  id,
  label,
  range,
  value,
  valueText,
  onChange,
}: RangeControlProps): ReactElement {
  return (
    <div className="whatif-control">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        aria-valuetext={valueText}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output htmlFor={id}>{valueText}</output>
    </div>
  );
}
