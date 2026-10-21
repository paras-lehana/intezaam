/**
 * Runtime configuration — the only module that reads `process.env`.
 *
 * Responsibility: turn environment variables into one typed, frozen config object with safe
 * defaults; the LLM gateway part goes through the outbound allow-list in llm-config.ts.
 * Boundary: everything else receives config as a parameter, which keeps the server testable
 * without touching the real environment.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
  type LlmServiceConfig,
  type RefusedSetting,
  llmEnvShape,
  llmSettingsFrom,
} from './llm-config.js';

/** The container's documented port (Dockerfile EXPOSE 8080). */
const DEFAULT_PORT = 8080;

/** Highest valid TCP port. */
const MAX_PORT = 65_535;

/**
 * 45 s per model attempt: the slower failover model answered in 25.8 s through the gateway in
 * the live probe (2026-10-20 18:03), so anything shorter would time out a healthy fallback.
 */
const DEFAULT_LLM_TIMEOUT_MS = 45_000;

/** Upper bound for the per-attempt timeout so a typo cannot hold connections for hours. */
const MAX_LLM_TIMEOUT_MS = 110_000;

/**
 * One hop: Traefik is the only proxy whose X-Forwarded-For entry is trusted; the Cloudflare
 * hop is resolved by the client key (http/client-key.ts, SECURITY.md threat 11). Trusting 2
 * hops would let a caller that reaches the origin directly write the X-Forwarded-For entry
 * its rate-limit bucket is keyed on.
 */
const DEFAULT_TRUST_PROXY_HOPS = 1;

/** More hops than any sane chain; bounds a typo that would let clients spoof their address. */
const MAX_TRUST_PROXY_HOPS = 5;

/**
 * The web build sits next to this package in the monorepo and in the container
 * (`apps/server/dist` → `apps/web/dist`), so it is resolved from this file, not the cwd.
 */
const DEFAULT_WEB_DIST_DIR = fileURLToPath(new URL('../../web/dist', import.meta.url));

export const NODE_ENVS = ['production', 'development', 'test'] as const;

export type NodeEnv = (typeof NODE_ENVS)[number];

export type { LlmServiceConfig, RefusedSetting };

/** Typed, immutable server configuration. */
export interface ServerConfig {
  readonly port: number;
  /** Absent means every AI feature uses its labelled offline twin. */
  readonly llmService: LlmServiceConfig | undefined;
  /** Per model attempt. */
  readonly llmTimeoutMs: number;
  /** Proxies in front of the container whose `X-Forwarded-For` entries are trusted. */
  readonly trustProxyHops: number;
  readonly webDistDir: string;
  readonly nodeEnv: NodeEnv;
  readonly appVersion: string;
  /** Settings present but refused by the outbound allow-list; the self-test reads these. */
  readonly refused: readonly RefusedSetting[];
}

const packageJsonSchema = z.object({ version: z.string().min(1) });

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(MAX_PORT).default(DEFAULT_PORT),
  LLM_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_LLM_TIMEOUT_MS)
    .default(DEFAULT_LLM_TIMEOUT_MS),
  TRUST_PROXY_HOPS: z.coerce
    .number()
    .int()
    .min(0)
    .max(MAX_TRUST_PROXY_HOPS)
    .default(DEFAULT_TRUST_PROXY_HOPS),
  WEB_DIST_DIR: z.string().trim().min(1).optional(),
  NODE_ENV: z.enum(NODE_ENVS).default('development'),
  ...llmEnvShape,
});

/** Environment shape accepted by {@link loadConfig}; matches `process.env`. */
export type EnvSource = Readonly<Record<string, string | undefined>>;

/** Reads the version from this package's package.json (same relative path from src/ and dist/). */
function readAppVersion(): string {
  const raw: unknown = JSON.parse(
    readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'),
  );
  const parsed = packageJsonSchema.safeParse(raw);
  return parsed.success ? parsed.data.version : '0.0.0';
}

/**
 * Parses the environment into a frozen {@link ServerConfig}. Invalid numeric values throw at
 * startup on purpose: a misconfigured service should fail its deploy, not serve.
 * @example
 * loadConfig({ PORT: '3000' }).port; // 3000
 */
export function loadConfig(env: EnvSource = process.env): ServerConfig {
  const parsed = envSchema.parse(env);
  const llm = llmSettingsFrom(parsed);
  return Object.freeze({
    port: parsed.PORT,
    llmService: llm.llmService,
    llmTimeoutMs: parsed.LLM_TIMEOUT_MS,
    trustProxyHops: parsed.TRUST_PROXY_HOPS,
    webDistDir: parsed.WEB_DIST_DIR ?? DEFAULT_WEB_DIST_DIR,
    nodeEnv: parsed.NODE_ENV,
    appVersion: readAppVersion(),
    refused: llm.refused,
  });
}
