/**
 * Money verdict vocabulary — the result shape and the on-screen label of each money status.
 *
 * Responsibility: the `MoneyVerdict` every money model returns and `MONEY_LABELS`, keyed by
 * the closed status union so a new status cannot ship without its words. Stretch reads
 * "Needs changes", never "not feasible". Boundary: words and shapes only;
 * verdict-money.ts and verdict-wedding.ts decide the status.
 */
import type { CateringLevel } from '../domain/catering.js';
import type { MoneyStatus } from '../schemas/plan-money.js';

export interface MoneyVerdict {
  readonly status: MoneyStatus;
  readonly reason: string;
  readonly traceIds: readonly string[];
  /** The caterer class the cost check prices at (fixed per model elsewhere). */
  readonly level: CateringLevel;
}

/** How each money status reads on screen. */
export const MONEY_LABELS: Readonly<Record<MoneyStatus, string>> = {
  stretch: 'Needs changes',
  'home-style': 'Simple & home-style',
  lean: 'Lean',
  balanced: 'Balanced',
  premium: 'Premium',
};

/** Statuses below the published typical range: the plan shows costed levers for these. */
export const TIGHT_MONEY_STATUSES: readonly MoneyStatus[] = ['stretch', 'home-style', 'lean'];
