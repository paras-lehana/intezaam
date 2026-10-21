/**
 * A before → after table of the figures that changed, with the signed difference in words.
 *
 * Responsibility: one row per changed figure — label, before, after and "+₹50,000" /
 * "−12 guests" written out (up/down also as a word for screen readers), never colour alone.
 * Boundary: display only; the rows come from diff-rows.ts.
 */
import type { ReactElement } from 'react';
import { formatInr } from '@intezaam/core';
import type { DiffRow } from './diff-rows';

export interface DiffNumbersProps {
  readonly caption: string;
  readonly rows: readonly DiffRow[];
}

function shown(row: DiffRow, value: number): string {
  return row.money ? formatInr(value) : String(value);
}

function change(row: DiffRow): string {
  const delta = row.after - row.before;
  const size = row.money ? formatInr(Math.abs(delta)) : String(Math.abs(delta));
  return `${delta > 0 ? '+' : '−'}${size}`;
}

export function DiffNumbers({ caption, rows }: DiffNumbersProps): ReactElement | null {
  if (rows.length === 0) return null;
  return (
    <table className="diff__table">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">What</th>
          <th scope="col">Now</th>
          <th scope="col">After</th>
          <th scope="col">Change</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const up = row.after > row.before;
          return (
            <tr key={row.key}>
              <th scope="row">{row.label}</th>
              <td>{shown(row, row.before)}</td>
              <td>{shown(row, row.after)}</td>
              <td className={up ? 'diff__up' : 'diff__down'}>
                {change(row)}
                <span className="visually-hidden">{up ? ' more' : ' less'}</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
