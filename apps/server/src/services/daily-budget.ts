/**
 * Daily budget guard — keeps every model under its free-tier requests-per-day quota.
 *
 * Responsibility: count attempts per model for the current quota day and report a model as
 * spent once it reaches its limit (default 450 = 90% of the free tier's 500 RPD), so the
 * failover skips it and, when all are spent, the server serves the labelled offline twin with
 * reason `daily_quota` (SPEC-MVP addendum item 13). The quota day turns over at midnight
 * America/Los_Angeles, when Google resets requests-per-day. Boundary: in memory, per process;
 * the clock is injected so tests cross midnight without waiting.
 */

/** Google resets the Gemini API's requests-per-day quota at midnight Pacific time. */
const QUOTA_TIME_ZONE = 'America/Los_Angeles';

// Efficiency: one formatter for the process; building an Intl formatter per call is slow.
const QUOTA_DAY_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: QUOTA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * The quota day (YYYY-MM-DD in Pacific time) an instant falls on.
 * @example
 * quotaDay(Date.UTC(2026, 9, 21, 6, 59)); // '2026-10-20' (11:59 pm in Los Angeles)
 */
export function quotaDay(epochMs: number): string {
  return QUOTA_DAY_FORMAT.format(epochMs);
}

export interface DailyBudget {
  /** True while `model` has requests left today; unknown models are never limited. */
  available(model: string): boolean;
  /** Records one attempt (successful or not: Google counts both). */
  spend(model: string): void;
}

export interface DailyBudgetOptions {
  /** Requests per day per model. */
  readonly limits: ReadonlyMap<string, number>;
  readonly now: () => number;
}

/**
 * Creates a guard over `limits`.
 * @example
 * const budget = createDailyBudget({ limits: new Map([['gemini-3.5-flash-lite', 450]]), now: Date.now });
 */
export function createDailyBudget(options: DailyBudgetOptions): DailyBudget {
  const { limits, now } = options;
  let day = quotaDay(now());
  const used = new Map<string, number>();

  const rollover = (): void => {
    const today = quotaDay(now());
    if (today === day) return;
    day = today;
    used.clear();
  };

  return {
    available(model) {
      rollover();
      const limit = limits.get(model);
      return limit === undefined || (used.get(model) ?? 0) < limit;
    },
    spend(model) {
      rollover();
      used.set(model, (used.get(model) ?? 0) + 1);
    },
  };
}

/**
 * A budget that never runs out (the offline client and unit tests of the failover).
 * @example
 * unlimitedBudget().available('any-model'); // true
 */
export function unlimitedBudget(): DailyBudget {
  return { available: () => true, spend: () => undefined };
}
