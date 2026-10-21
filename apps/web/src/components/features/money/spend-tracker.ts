/**
 * The spend tracker's arithmetic and its on-device memory.
 *
 * Responsibility: read typed rupee amounts, compare what is committed or paid against each
 * planned line (warn at 90%, over above 100% — feature #14), and remember the
 * typed amounts on this device only, validated on the way back in because storage is
 * untrusted input. Boundary: no React; nothing here is ever sent to a server.
 */
import { z } from 'zod';
import { BUDGET_CATEGORIES, type BudgetCategory } from '@intezaam/core/domain';
import { storePreference } from '../../../lib/preferences';
import { readStored } from '../common/stored-json';

export const SPEND_STORAGE_KEY = 'intezaam:spend';

/** Feature #14 (from the owner's planner): warn once a line is 90% used. */
export const WARN_SHARE = 0.9;

/** "₹12,34,56,789" is 12 characters; 16 leaves room for spaces and stops runaway input. */
export const MAX_AMOUNT_CHARS = 16;

export type SpendStatus = 'clear' | 'near' | 'over';

/** What the reader typed, kept as text so the box shows exactly what they wrote. */
export interface SpendEntry {
  readonly committed: string;
  readonly paid: string;
}

export type SpendBook = Readonly<Partial<Record<BudgetCategory, SpendEntry>>>;

const spendBookSchema = z.partialRecord(
  z.enum(BUDGET_CATEGORIES),
  z.object({
    committed: z.string().max(MAX_AMOUNT_CHARS),
    paid: z.string().max(MAX_AMOUNT_CHARS),
  }),
);

/** Rupee and digit-group characters people type ("₹25,000"); the rest must be digits. */
const AMOUNT_DECORATION = /[₹,\s]/g;

/**
 * Typed text as whole rupees; anything that is not a non-negative number counts as zero.
 * @example
 * parseRupees('₹1,50,000'); // 150000
 * parseRupees('abc'); // 0
 */
export function parseRupees(text: string): number {
  const value = Number(text.replace(AMOUNT_DECORATION, ''));
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

/**
 * How much of a line is used: the larger of committed and paid (payments come out of
 * what was committed, so the two are not added).
 * @example
 * spentOf({ committed: '50000', paid: '20000' }); // 50000
 */
export function spentOf(entry: SpendEntry | undefined): number {
  return entry === undefined ? 0 : Math.max(parseRupees(entry.committed), parseRupees(entry.paid));
}

/**
 * Within plan, near the limit (≥ 90%) or over the planned amount.
 * @example
 * spendStatus(100000, 95000); // 'near'
 */
export function spendStatus(planned: number, spent: number): SpendStatus {
  if (spent > planned) return 'over';
  return spent >= planned * WARN_SHARE && spent > 0 ? 'near' : 'clear';
}

/**
 * The amounts typed on an earlier visit; empty when absent, blocked or malformed.
 * @example
 * readSpendBook(); // {} on a first visit
 */
export function readSpendBook(): SpendBook {
  return readStored(SPEND_STORAGE_KEY, spendBookSchema, {});
}

/**
 * Remembers the typed amounts on this device.
 * @example
 * storeSpendBook({ venue: { committed: '200000', paid: '60000' } });
 */
export function storeSpendBook(book: SpendBook): void {
  storePreference(SPEND_STORAGE_KEY, JSON.stringify(book));
}
