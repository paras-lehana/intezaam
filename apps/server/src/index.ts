/**
 * Process entry point — wires real dependencies and starts listening.
 *
 * Responsibility: load config, run the startup self-test (production refuses to start on a
 * refused outbound setting), choose the text client (the LLM gateway with its daily budget
 * guard, or the offline planner), write JSON logs to stdout, and shut down gracefully on
 * SIGTERM, which Docker sends before stopping the container. Boundary: no application logic.
 */
import { randomUUID } from 'node:crypto';
import { loadConfig } from './config.js';
import { createJsonLogger } from './logger.js';
import { runSelfTest } from './self-test.js';
import { buildApp } from './server.js';
import { createDailyBudget } from './services/daily-budget.js';
import {
  type GenAiClient,
  createGenAiClient,
  createOfflineGenAiClient,
} from './services/genai-client.js';
import { createLlmServiceCaller } from './services/llm-service-caller.js';

/** Docker waits 10 s between SIGTERM and SIGKILL; exit a little before that. */
const SHUTDOWN_GRACE_MS = 8_000;

const config = loadConfig();
const logger = createJsonLogger((line) => process.stdout.write(`${line}\n`));

const selfTest = runSelfTest(config);
for (const problem of selfTest.problems) logger.log('WARNING', 'startup self-test', { problem });
if (selfTest.decision === 'refuse') {
  logger.log('ERROR', 'startup self-test failed in production; refusing to start');
  process.exit(1);
}

/** The LLM gateway when configured and allowed, else the labelled offline planner. */
function createTextClient(): GenAiClient {
  const llm = config.llmService;
  if (llm === undefined) return createOfflineGenAiClient();
  const caller = createLlmServiceCaller({
    url: llm.url,
    internalKey: llm.internalKey,
    upstreamUrl: llm.upstreamUrl,
    upstreamKey: llm.upstreamKey,
    ref: llm.ref,
    fetch,
  });
  const budget = createDailyBudget({ limits: llm.dailyLimits, now: Date.now });
  return createGenAiClient({
    caller,
    models: llm.models,
    timeoutMs: config.llmTimeoutMs,
    now: Date.now,
    budget,
  });
}

const genai = createTextClient();
const app = buildApp(config, { genai, now: Date.now, logger, newRequestId: randomUUID });
const server = app.listen(config.port, () => {
  logger.log('INFO', 'server listening', {
    port: config.port,
    version: config.appVersion,
    aiConfigured: genai.configured,
    models: genai.models.join(','),
  });
});

process.on('SIGTERM', () => {
  logger.log('INFO', 'SIGTERM received, closing server');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), SHUTDOWN_GRACE_MS).unref();
});
