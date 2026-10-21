# Evaluation mapping

Where each evaluation area is delivered, with a path for every claim.

## 1. Code Quality

- A pure, deterministic domain package (no I/O, clock or randomness; `todayIso` and nonces are parameters) →
  [`packages/core/src`](packages/core/src)
- Errors as values with a closed error taxonomy mapped to HTTP statuses in one table →
  [`result.ts`](packages/core/src/result.ts), [`errors.ts`](packages/core/src/errors.ts)
- One zod schema per contract, shared by server validation, the web API client and AI-output validation →
  [`schemas`](packages/core/src/schemas), [`lib/api.ts`](apps/web/src/lib/api.ts)
- Tables keyed by closed unions, so a missing case is a compile error: 93 rule ids in
  [`domain/rule-ids.ts`](packages/core/src/domain/rule-ids.ts) documented in `Record<RuleId, …>`
  ([`domain/rules.ts`](packages/core/src/domain/rules.ts)); vendor playbooks, money labels and lazy panels likewise →
  [`domain/vendor-playbook.ts`](packages/core/src/domain/vendor-playbook.ts),
  [`engine/verdict-labels.ts`](packages/core/src/engine/verdict-labels.ts)
- Every number carries a trace (rule, inputs, effect, sources, confidence); plan items reference trace ids →
  [`engine/trace.ts`](packages/core/src/engine/trace.ts)
- Every domain fact cites one of 91 registered sources by a typed id →
  [`domain/sources.ts`](packages/core/src/domain/sources.ts)
- Dependency injection: `buildApp(config, deps)`; `config.ts` is the only environment reader →
  [`server.ts`](apps/server/src/server.ts), [`config.ts`](apps/server/src/config.ts)
- Strict TypeScript 6 (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`) →
  [`tsconfig.base.json`](tsconfig.base.json)
- Repo-wide ESLint (typescript-eslint strict, jsx-a11y strict, react-hooks), zero warnings →
  [`eslint.config.js`](eslint.config.js)
- No copy-pasted code: jscpd finds 0 clones across core, server and web sources (threshold 0) → `npm run dup-check`
- Every file opens with its responsibility and boundary; files stay under 250 lines and components under 150; a
  pre-publish script rejects casts, banned patterns and secrets →
  [`scripts/preflight.sh`](scripts/preflight.sh), [`CONTRIBUTING.md`](CONTRIBUTING.md)

## 2. Problem Statement Alignment

- Weddings (9 traditions plus civil), birthdays (first to 60th) and community events (pandals, society festivals,
  satsangs, RWA functions, fundraisers): 4 families and 18 kinds → [`domain/events.ts`](packages/core/src/domain/events.ts)
- Budgets, timelines, vendor checklists and personalised ideas, each a working tab → the alignment table in
  [`README.md`](README.md#problem-statement-alignment)
- Decisions from the user's context, explained: a two-axis verdict, costed levers and "Why this?" on every number →
  [`engine/verdict.ts`](packages/core/src/engine/verdict.ts), [`engine/levers.ts`](packages/core/src/engine/levers.ts)
- Four personas drive the samples, the README and the e2e suite →
  [`domain/samples.ts`](packages/core/src/domain/samples.ts), [`e2e/personas.spec.ts`](e2e/personas.spec.ts)
- A clear boundary: estimates, not quotes; never books, pays or gives legal advice; dates are indicative →
  [`offline/ask.ts`](packages/core/src/offline/ask.ts), [`EstimateNote.tsx`](apps/web/src/components/features/common/EstimateNote.tsx)

## 3. Security

- Strict CSP without `unsafe-inline`, HSTS preload, COOP/CORP, Permissions-Policy →
  [`http/security-headers.ts`](apps/server/src/http/security-headers.ts)
- Magic-byte validation of quote uploads in the shared schema →
  [`security/magic-bytes.ts`](packages/core/src/security/magic-bytes.ts)
- PII redaction before every model call; Unicode sanitiser incl. bidi isolates; nonce-fenced prompts →
  [`privacy/redact.ts`](packages/core/src/privacy/redact.ts), [`security/sanitize.ts`](packages/core/src/security/sanitize.ts),
  [`genai/prompt-boundary.ts`](packages/core/src/genai/prompt-boundary.ts)
- Outbound allow-list for the LLM gateway and a fail-closed startup self-test →
  [`llm-config.ts`](apps/server/src/llm-config.ts), [`self-test.ts`](apps/server/src/self-test.ts)
- Cloudflare-aware client keys for rate limiting (IPv6 by /64), tested against a forged header and subnet rotation →
  [`http/client-key.ts`](apps/server/src/http/client-key.ts), [`middleware/rate-limit.ts`](apps/server/src/middleware/rate-limit.ts)
- CSV formula-injection guard; validated share links and saved files →
  [`export/csv.ts`](packages/core/src/export/csv.ts), [`export/context-url.ts`](packages/core/src/export/context-url.ts)
- SHA-pinned CI with a read-only token and `npm audit`; non-root runtime image →
  [`.github/workflows/ci.yml`](.github/workflows/ci.yml), [`Dockerfile`](Dockerfile)
- Threat model → [`SECURITY.md`](SECURITY.md)

## 4. Efficiency

- The engine runs in the browser: plans and what-ifs need no request →
  [`what-if/simulate.ts`](apps/web/src/components/features/what-if/simulate.ts)
- One model call per distinct plan; rules answer common questions; per-service cache; a concurrency gate on model calls
  only (cache hits and rule answers never wait); daily budget; abort on disconnect →
  [`services/plan-service.ts`](apps/server/src/services/plan-service.ts),
  [`services/gated-genai.ts`](apps/server/src/services/gated-genai.ts),
  [`services/service-kit.ts`](apps/server/src/services/service-kit.ts), [`http/abort.ts`](apps/server/src/http/abort.ts)
- Route- and tab-level code splitting; the home route ships without the engine →
  [`App.tsx`](apps/web/src/App.tsx), [`workspace/lazy-panels.ts`](apps/web/src/components/features/workspace/lazy-panels.ts)
- Subpath exports and `"sideEffects": false` keep prompts and offline libraries out of the browser bundle →
  [`packages/core/package.json`](packages/core/package.json)
- Self-hosted fonts, gzip, immutable asset caching →
  [`static-web.ts`](apps/server/src/static-web.ts)
- Decisions table and measured bundle sizes → [`ARCHITECTURE.md`](ARCHITECTURE.md#efficiency-decisions)

## 5. Testing

- Core unit tests (1,390), server integration tests (172) and web component tests (512), all passing on 2026-10-21 →
  [`packages/core/src/__tests__`](packages/core/src/__tests__), [`apps/server/src/__tests__`](apps/server/src/__tests__),
  [`apps/web/src/__tests__`](apps/web/src/__tests__)
- Coverage gates on core (95/95/95/90), server (85/85/85/75) and web (95/93/95/83); measured core 99.92% lines, server
  99.7% lines, web 98.45% lines → [`packages/core/vitest.config.ts`](packages/core/vitest.config.ts),
  [`apps/server/vitest.config.ts`](apps/server/vitest.config.ts), [`apps/web/vitest.config.ts`](apps/web/vitest.config.ts)
- Fixtures derived from the engine; a 60-brief battery and a GenAI eval battery →
  [`fixtures/eval-battery.ts`](packages/core/src/__tests__/fixtures/eval-battery.ts)
- 46 Playwright tests (11 journeys, 4 persona checks and 8 axe scans per device) on desktop and a 390×844 phone →
  [`e2e`](e2e)
- Details and counts, from the latest run → [`TESTING.md`](TESTING.md); a core test,
  [`docs-test-counts.test.ts`](packages/core/src/__tests__/docs-test-counts.test.ts), fails if this file, the README or
  the changelog states other figures than TESTING.md

## 6. Accessibility

- Semantic landmarks, skip link, labelled controls, live regions, focus management, WAI-ARIA tabs, reduced motion and a
  pause control, dark mode, 44 px targets → [`ACCESSIBILITY.md`](ACCESSIBILITY.md#decisions-and-evidence)
- Every text token pair measured at 5.80:1 or more in both themes →
  [`ACCESSIBILITY.md`](ACCESSIBILITY.md#token-contrast-computed)
- `eslint-plugin-jsx-a11y` strict and axe scans of every route and tab in both themes →
  [`eslint.config.js`](eslint.config.js), [`e2e/a11y.spec.ts`](e2e/a11y.spec.ts)

## 7. GenAI and Google services

- Google Gemini on the Gemini API free tier, server-side only, five jobs with guards and offline twins →
  [`GENAI_ARCHITECTURE.md`](GENAI_ARCHITECTURE.md), [`services/genai-client.ts`](apps/server/src/services/genai-client.ts)
- Google Calendar, Maps, Gmail, YouTube and Sheets through links and files, no keys →
  [`integrations/google-links.ts`](packages/core/src/integrations/google-links.ts), [`export/ics.ts`](packages/core/src/export/ics.ts)
- One catalog constant (8 implemented, 5 declined with reasons) feeds the README, `GET /api/google/services` and the
  About page → [`google/service-catalog.ts`](packages/core/src/google/service-catalog.ts)
