/**
 * Startup self-test — the fail-closed gate that runs before the server listens.
 *
 * Responsibility: list every configuration problem that would send prompts to an unexpected
 * host or silently lose the AI (settings the outbound allow-list refused), and decide what
 * happens: production refuses to start, so a bad deploy fails loudly instead of serving;
 * development and tests start on the offline planner with a warning. Boundary: pure — index.ts
 * logs the problems and exits; nothing here reads the environment or touches the network.
 */
import type { ServerConfig } from './config.js';

export const SELF_TEST_DECISIONS = ['start', 'refuse'] as const;

export type SelfTestDecision = (typeof SELF_TEST_DECISIONS)[number];

export interface SelfTestResult {
  readonly decision: SelfTestDecision;
  /** One fixed sentence per problem, naming the variable but never its value. */
  readonly problems: readonly string[];
}

/**
 * Checks the configuration the server is about to start with.
 * @example
 * runSelfTest(loadConfig({ NODE_ENV: 'production', LLM_SERVICE_URL: 'https://evil.example', … })).decision; // 'refuse'
 * runSelfTest(loadConfig({})).decision; // 'start' (offline by choice)
 */
export function runSelfTest(config: ServerConfig): SelfTestResult {
  const problems = config.refused.map(
    (setting) => `${setting.name} ${setting.reason}; AI features stay offline.`,
  );
  // Security: in production a refused outbound setting is a deploy error, so fail closed.
  const decision: SelfTestDecision =
    problems.length > 0 && config.nodeEnv === 'production' ? 'refuse' : 'start';
  return { decision, problems };
}
