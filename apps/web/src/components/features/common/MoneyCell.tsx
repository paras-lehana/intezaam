/**
 * A rupee amount in full Indian digit grouping (₹25,00,000), aligned for tables.
 *
 * Responsibility: one presentation for every amount in the workspace — whole rupees,
 * lakh/crore grouping, tabular figures so columns line up. Boundary: formatting only; the
 * engine has already rounded the amount.
 */
import type { ReactElement } from 'react';
import { formatInr } from '@intezaam/core';

export interface MoneyCellProps {
  readonly amount: number;
}

export function MoneyCell({ amount }: MoneyCellProps): ReactElement {
  return <span className="money">{formatInr(amount)}</span>;
}
