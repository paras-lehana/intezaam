/**
 * A value that follows its source only once the source stops changing.
 *
 * Responsibility: hold back a fast-changing value (a slider being dragged or held on an arrow
 * key) until it has been still for a moment, so a live region speaks once per settled
 * choice instead of once per step. Boundary: timing only; the caller decides what the value
 * says and where it is announced.
 */
import { useEffect, useState } from 'react';

/**
 * Half a second: longer than a held arrow key's repeat (about 30 ms) and a quick drag's
 * pauses, short enough that the announcement still follows the reader's choice.
 */
export const SETTLE_MS = 500;

/**
 * The latest `value` once it has stayed the same for `delayMs`.
 * @example
 * const spoken = useSettledValue(summary); // updates 500 ms after the slider stops
 */
export function useSettledValue<T>(value: T, delayMs: number = SETTLE_MS): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return settled;
}
