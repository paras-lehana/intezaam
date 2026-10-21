# Testing

Every layer is tested against the real code paths with no network: core tests call the pure engines directly, the
server suite builds the production Express app with a scripted model and a fake clock, and web tests render real
components with plans produced by the core engine itself.

## Layer matrix

| Layer              | Tooling                                              | Lives in                                                                                     | What it proves                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Run                   |
| ------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| Core unit          | Vitest                                               | [`packages/core/src/__tests__`](packages/core/src/__tests__)                                 | Domain tables are complete and sourced (every rule id has a rule, every cited source exists); the budget always sums to the exact rupee; verdict bands and boundaries; levers re-price through the engine; timeline compression, undated and past modes; muhurat, Chaturmas and festival dates; vendors and payment milestones; headcount, food, space, diet and access rules; permissions, crowd and community money; what-if diffs; exports (ICS, CSV injection guard, share text, share link); Google links; every prompt builder, guard and offline twin; the 60-brief battery and the GenAI eval battery; sanitiser, magic bytes and PII redaction; the root docs state the register size and the test counts below | `npm run test:core`   |
| Server integration | Vitest + supertest                                   | [`apps/server/src/__tests__`](apps/server/src/__tests__)                                     | Every route through the real app: validation envelopes never echo input, 64 kB and 3 MiB body limits, security headers and CSP, Gemini and offline modes, cache hits, invented numbers swapped out, the plan endpoint equals `buildPlan`, failover and per-model daily quota, abort on client disconnect, the 8 client-IP scenarios behind Cloudflare, PDF page caps, the gateway adapter, config allow-list and the fail-closed self-test                                                                                                                                                                                                                                                                               | `npm run test:server` |
| Web component      | Vitest + Testing Library + jsdom                     | [`apps/web/src/__tests__`](apps/web/src/__tests__)                                           | Form state, validation and sample fill (samples never run the plan); brief review; every workspace panel with keyboard-operable tabs; "Why this?" disclosures; what-if simulation and diff; Ask with proposed changes; guest CSV import and export, chanda and ledger; quote file reading; ICS and CSV downloads; API client validation and error mapping; theme and motion preferences                                                                                                                                                                                                                                                                                                                                  | `npm run test:web`    |
| End-to-end         | Playwright (desktop Chrome + 390×844 phone)          | [`e2e/journey.spec.ts`](e2e/journey.spec.ts), [`e2e/personas.spec.ts`](e2e/personas.spec.ts) | A typed Hinglish brief read into the form and planned with a two-axis verdict; "Why this?" shows a rule and its source; the outdoor DJ after 10 pm flagged on Safety; samples fill without planning; the society utsav's per-household contribution and permissions; an empty submission's accessible error; the refusal to book or pay; the `.ics` download; the Google services list; the web manifest and icons; each persona's key decision, and no unneeded flags for a control party                                                                                                                                                                                                                               | `npm run e2e`         |
| Accessibility      | Playwright + axe-core (WCAG 2.0, 2.1, 2.2 A/AA tags) | [`e2e/a11y.spec.ts`](e2e/a11y.spec.ts)                                                       | No serious or critical violations on `/`, `/plan` and `/about` and on every plan workspace tab, in light and dark themes, on desktop and phone                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `npm run a11y`        |

## Latest local run (2026-10-21)

`npm run test:coverage` passed **2,073 tests in 288 files**, and `npx playwright test` passed **46 of 46** (23 per
device: 11 journeys, 4 persona checks and 8 axe scans) against the production build with the offline planner.

| Workspace       | Test files | Tests | Statements | Branches | Functions | Lines  | Thresholds (lines / statements / functions / branches) |
| --------------- | ---------- | ----- | ---------- | -------- | --------- | ------ | ------------------------------------------------------ |
| `packages/core` | 172        | 1,389 | 99.74%     | 95.78%   | 99.91%    | 99.92% | 95 / 95 / 95 / 90                                      |
| `apps/server`   | 18         | 172   | 98.65%     | 94.02%   | 100%      | 99.7%  | 85 / 85 / 85 / 75                                      |
| `apps/web`      | 98         | 512   | 96.58%     | 87.74%   | 98.31%    | 98.45% | 95 / 93 / 95 / 83                                      |

The README, [EVALUATION_MAPPING.md](EVALUATION_MAPPING.md) and [CHANGELOG.md](CHANGELOG.md) repeat these figures, and
[`docs-test-counts.test.ts`](packages/core/src/__tests__/docs-test-counts.test.ts) fails when any of them differs from
this table or when the headline is not the sum of its rows. After every run, copy the runner's counts and percentages
into this table first.

`npm run type-check` compiles sources, tests and e2e specs under the same strict settings; `npm run lint` (zero
warnings) and `npm run dup-check` (jscpd: 0 clones) passed in the same session.

## Design choices that make tests honest

- **Fixtures are derived, not typed in.** Expected values come from the code under test: web panels render plans built
  with `buildPlan(sampleContext(…))` ([`plan-fixtures.ts`](apps/web/src/__tests__/features/plan-fixtures.ts)), and the
  server helpers pin only inputs while expected outputs come from core at test time
  ([`helpers.ts`](apps/server/src/__tests__/helpers.ts)). The e2e journeys do the same: they pin the browser's clock to
  one day and read the exact risk, access item, muhurat note and "Why this?" rule and source from the engine's plan for
  that day ([`expected.ts`](e2e/expected.ts)). Each check is scoped to the section or disclosure panel that holds the
  decision, so a panel's fixed intro text or the footer's sources link can never satisfy it, and a control plan (the
  8 pm children's party) must show neither the night-sound flag nor elder seating.
- **No clock in core.** Core never reads the clock or randomness; `todayIso` and nonces are parameters, so every date
  test is deterministic.
- **The real app, fake edges.** `buildApp(config, deps)` is the production factory; tests inject a scripted model caller,
  a fake clock and a capturing logger.
- **The offline planner is a first-class fixture.** It gives stable, realistic answers for component and e2e tests with
  no key, and the same shapes as the Gemini path.
- **Batteries, not anecdotes.** The 60 labelled briefs and the GenAI eval battery
  ([`fixtures/eval-battery.ts`](packages/core/src/__tests__/fixtures/eval-battery.ts)) run on every test run.
- **E2E can target a deployment.** `E2E_BASE_URL=https://<your-host> npm run e2e` runs the same journeys against a
  deployed copy instead of the local server ([`playwright.config.ts`](playwright.config.ts)).
- **CI runs everything.** Type-check, lint, formatting, duplication, tests with coverage, build, then the Playwright
  suite on both viewports ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).
