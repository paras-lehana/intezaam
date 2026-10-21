# Architecture

Three layers with a strict dependency direction: **web → core** and **server → core**, and core depends on nothing but
zod. Everything that must be exact (money, dates, counts, rules, checklists) lives in core as pure functions. The
browser runs the same engine as the server, so a plan and every what-if appear instantly; the server adds the five
Gemini jobs and recomputes the plan itself for each of them, so it never trusts a number the client sent.

## Layer diagram

```
┌──────────────────── one container (self-hosted behind Cloudflare → Traefik) ─────────────────────┐
│                                                                                                  │
│  apps/web (React 19 SPA, static)                 apps/server (Express 5)                         │
│  ─ / home · /plan workspace · /about     ──────► /api/brief  /api/plan  /api/plan/narration     │
│  ─ form + brief box → buildPlan() in the  same   /api/plan/what-if  /api/quotes/read             │
│    browser (instant plan and what-if)    origin  /api/quotes/compare  /api/drafts  /api/ask      │
│  ─ tabs: Overview · Money · Timeline ·           /api/google/services  /api/health               │
│    Vendors · People · Ideas · Safety ·             │                                             │
│    Share; What if and Ask drawers                  ├─ request id · log · helmet CSP · gzip ·     │
│  ─ lib/api.ts: the only fetch caller;              │  per-client limiter · zod validation ·      │
│    every response parsed with core zod             │  concurrency gate · error envelope          │
│  ─ device-only: guest list, spend tracker,         ├─ services/*: redact → sanitise → cache →    │
│    ledger, saved context (localStorage)            │  ONE model call → guards → offline twin     │
│                                                    ├─ services/genai-client.ts ──► LLM gateway   │
│                                                    │       └─► Gemini API (free tier)            │
│                                                    │                                             │
│  packages/core (pure: no I/O, no clock, no randomness) ◄──────────────────────────────────────── │
│  ─ schemas (zod contracts) · domain (tables with sources, rule ids) · engine (context, budget,   │
│    verdict, levers, timeline, vendors, headcount, safety, community, what-if, trace) · export    │
│    (ics, csv, share text, share link) · integrations (Google links) · genai (prompts, guards) ·  │
│    offline (twin of every GenAI job) · security (sanitiser, magic bytes) · privacy (redaction)   │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Why this shape**

- **One deployable, one origin.** The Express process serves the web build and the API, so the browser only calls
  relative `/api/*` paths: no CORS surface, no cross-service URL to misconfigure. See
  [`static-web.ts`](apps/server/src/static-web.ts).
- **Core is the product.** Rules, money maths, dates, guards and redaction are pure and unit-tested; the server is a
  thin adapter and the web is a view. One zod schema per contract validates server requests, web API responses and
  every model reply ([`packages/core/src/schemas`](packages/core/src/schemas)).
- **Subpath exports and `"sideEffects": false` keep the browser lean.** The web takes its code from the
  `@intezaam/core/engine`, `/schemas`, `/domain`, `/export` and `/integrations` subpaths, plus the money formatters
  (`formatInr`, `formatLakh`) and shared types from the package root. Because the package declares no side effects, Vite
  keeps only what the web uses: the production build contains no prompt text, offline draft template or offline idea
  ([`packages/core/package.json`](packages/core/package.json)).
- **Dependency injection.** `buildApp(config, deps)` receives the model client, the clock, the logger and the request-id
  generator, so tests run the production app against fakes with no network
  ([`server.ts`](apps/server/src/server.ts)). [`config.ts`](apps/server/src/config.ts) is the only `process.env` reader.

## Plan data flow

```
EventContext (form, brief or share link)
   ─► normaliseContext (CTX rules: tier, season, lead time, crowd class, rain risk)
   ─► budget split (BUD) ─► cost check (CST) ─► verdict (VER-M / VER-T / VER-F) ─► levers (LEV, re-priced)
   ─► timeline (TL, DATE) ─► functions and run sheet (FN) ─► vendors and payments (VEN)
   ─► headcount, food, space, diet, access (HC, FOOD, SPACE, DIET, ACC)
   ─► permissions, crowd, community money, risks, readiness (PERM, CROWD, COM, RISK, READY-01)
   ─► trace log + deduplicated sources ─► planSchema.parse ─► Result<Plan>
```

[`engine/plan.ts`](packages/core/src/engine/plan.ts) orchestrates the steps; every step writes trace items
(rule id, inputs, effect, sources, confidence) through [`engine/trace.ts`](packages/core/src/engine/trace.ts), and plan
items reference trace ids instead of embedding reasons.

## AI request flow (server)

```
POST /api/<job> ─► per-client limiter ─► JSON body limit ─► todayIso within a day of the server's date in India
   ─► zod strict schema ─► buildPlan(context, todayIso)            (the server's own numbers)
   ─► sanitise Unicode ─► redact PII ─► cache lookup (SHA-256 of the redacted input)
   ─► rules first (Ask) ─► ONE model call through the failover chain (daily budget per model, 45 s per attempt),
      holding one of 4 concurrency slots only while the model works (none free → the offline twin)
   ─► zod-validate the reply ─► code guards (evidence, faithfulness, idea limits, quote maths, patch validation)
   ─► or the offline twin with the same shape ─► response + provenance { mode, models, latencyMs, steps, reason? }
```

An `AbortController` tied to the response's `close` event cancels pending model attempts when the visitor leaves
([`http/abort.ts`](apps/server/src/http/abort.ts)).

## Efficiency decisions

| Decision                                                                                                                                                        | Where                                                                                                                                                                                        | Why                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| The engine runs in the browser; a plan and every what-if need no request                                                                                        | [`what-if/simulate.ts`](apps/web/src/components/features/what-if/simulate.ts), [`lib/plan-state.ts`](apps/web/src/lib/plan-state.ts)                                                         | Instant feedback, zero server cost for the most frequent action                                                            |
| One model call per distinct plan for the narration and ideas                                                                                                    | [`services/plan-service.ts`](apps/server/src/services/plan-service.ts)                                                                                                                       | Latency and quota scale with calls, not features                                                                           |
| Ask answers refusals, change commands and common intents by rule, with no model call                                                                            | [`services/ask-service.ts`](apps/server/src/services/ask-service.ts), [`offline/ask.ts`](packages/core/src/offline/ask.ts)                                                                   | The commonest questions cost nothing and answer instantly                                                                  |
| Result cache per service: 50 entries × 30 minutes, keyed by SHA-256 of the redacted input                                                                       | [`services/service-kit.ts`](apps/server/src/services/service-kit.ts)                                                                                                                         | Re-opening the same plan or re-reading the same quote costs no second call                                                 |
| Fastest model first, failover chain, per-model daily budget, last good model remembered                                                                         | [`services/genai-client.ts`](apps/server/src/services/genai-client.ts), [`services/daily-budget.ts`](apps/server/src/services/daily-budget.ts)                                               | Fast answers; quota exhaustion degrades to the offline planner instead of errors                                           |
| Concurrency gate on model calls only (4 at once; a call that finds no free slot serves the offline twin, a file read answers 429); abort when the client leaves | [`services/gated-genai.ts`](apps/server/src/services/gated-genai.ts), [`services/concurrency.ts`](apps/server/src/services/concurrency.ts), [`http/abort.ts`](apps/server/src/http/abort.ts) | Bounded memory and spend under bursts, while cache hits and rule answers never wait; no work for visitors who already left |
| Output token caps per job (2,048–8,192)                                                                                                                         | `*_MAX_OUTPUT_TOKENS` in [`services`](apps/server/src/services)                                                                                                                              | Bounded latency per request                                                                                                |
| Lever pricing re-runs only the money core, not the whole plan                                                                                                   | [`engine/lever-candidates.ts`](packages/core/src/engine/lever-candidates.ts)                                                                                                                 | Levers stay cheap enough to compute on every plan                                                                          |
| Vocabulary and gazetteer tables folded into Maps once at load                                                                                                   | [`offline/number-phrases.ts`](packages/core/src/offline/number-phrases.ts), [`domain/city-table.ts`](packages/core/src/domain/city-table.ts)                                                 | O(1) lookups for keystroke-driven re-plans and brief reading                                                               |
| A 2 MiB upload is type-checked by decoding 16 base64 characters                                                                                                 | [`security/base64.ts`](packages/core/src/security/base64.ts)                                                                                                                                 | The magic-byte check is constant-time, whatever the file size                                                              |
| Route-level and tab-level code splitting (`React.lazy`)                                                                                                         | [`App.tsx`](apps/web/src/App.tsx), [`workspace/lazy-panels.ts`](apps/web/src/components/features/workspace/lazy-panels.ts)                                                                   | The home page paints without the engine; each tab loads on first open                                                      |
| "Why this?" text and vendor checklists render only when opened                                                                                                  | [`TraceDisclosure.tsx`](apps/web/src/components/features/common/TraceDisclosure.tsx), [`VendorCard.tsx`](apps/web/src/components/features/vendors/VendorCard.tsx)                            | A plan has dozens of traces and 20+ vendors; closed ones cost nothing                                                      |
| One narration request per plan version; a newer version aborts the older; the reply is the narration alone (the browser already holds the plan)                 | [`lib/use-plan-state.ts`](apps/web/src/lib/use-plan-state.ts)                                                                                                                                | No stale or duplicate AI calls while the family edits                                                                      |
| gzip on every response; hashed assets cached for a year, `index.html` `no-cache`                                                                                | [`server.ts`](apps/server/src/server.ts), [`static-web.ts`](apps/server/src/static-web.ts)                                                                                                   | Small transfers, instant repeat visits, deploys take effect immediately                                                    |
| Self-hosted fonts, plain CSS tokens, no UI framework runtime                                                                                                    | [`styles/fonts.css`](apps/web/src/styles/fonts.css), [`styles/tokens.css`](apps/web/src/styles/tokens.css)                                                                                   | No third-party round trips; CSP stays `'self'`                                                                             |
| Stateless server, no database; plans live in the browser and in share-link fragments                                                                            | whole server, [`export/context-url.ts`](packages/core/src/export/context-url.ts)                                                                                                             | Nothing to scale or secure at rest                                                                                         |

**Measured bundle (`npm run build`, 2026-10-21, gzip sizes as reported by Vite):** the home route loads the entry chunk
(89.36 kB), the shared domain tables (38.78 kB), the runtime (0.42 kB) and the stylesheet (7.85 kB). The workspace
(18.01 kB), the engine (27.55 kB) and the schemas (40.17 kB) load only when `/plan` opens, and each tab after Overview
is its own chunk of 1.94–8.77 kB. All 30 JavaScript chunks total 793,983 bytes raw.

## Error handling contract

Core returns `Result<T, AppError>` and never throws for expected failures
([`result.ts`](packages/core/src/result.ts)). [`errors.ts`](packages/core/src/errors.ts) maps each of the seven error
codes to an HTTP status in one table (`HTTP_STATUS_BY_CODE`) and gives each a fixed, user-safe message. The server
sends `{ error: { code, message } }` from one place ([`http/respond.ts`](apps/server/src/http/respond.ts));
`internalHint` is logged, never sent, and validation messages never echo the input. The web client
([`lib/api.ts`](apps/web/src/lib/api.ts)) turns every failure (no network, an error status, an off-contract body) into a
typed `ApiError` value, and AI failures never block planning: the browser always has the engine's plan to show.
