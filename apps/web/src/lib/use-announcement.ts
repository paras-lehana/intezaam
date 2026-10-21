/**
 * Re-announce a live-region message for every new key, even when its words repeat.
 *
 * Responsibility: a polite live region speaks only when its text changes, so two plan
 * versions with the same sentence would leave a screen-reader user without confirmation.
 * For each new key the message is cleared at once and set again after a short pause, the
 * pattern screen readers reliably pick up. Boundary: timing only; the caller decides the
 * words and renders them in a `LiveRegion`.
 */
import { useEffect, useState } from 'react';

/**
 * How long the region stays empty before the message returns: long enough for screen
 * readers to register the cleared text as its own change (the 100 ms pause live-announcer
 * libraries commonly use), short enough to feel immediate.
 */
export const ANNOUNCE_DELAY_MS = 100;

/**
 * The text to put in the live region: empty right after `key` changes, then `message`.
 * @example
 * const spoken = useAnnouncement(planAnnouncement(plan, origin), state.version);
 * <LiveRegion message={spoken} />
 */
export function useAnnouncement(message: string, key: number): string {
  const [shownKey, setShownKey] = useState<number | undefined>(undefined);

  useEffect(() => {
    const timer = window.setTimeout(() => setShownKey(key), ANNOUNCE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [key]);

  return shownKey === key ? message : '';
}
