# Contributing

## Setup

```bash
npm install
npm run build
npm start            # http://localhost:8080 — works with no keys (the offline planner answers)
```

`npm run dev` runs the API with hot reload and the Vite dev server (proxying `/api`). Copy `.env.example` to
`apps/server/.env` to connect the Gemini path; every setting is documented there.

## Before you open a pull request

```bash
npm run verify       # type-check (source, tests, e2e) + lint (zero warnings) + tests with coverage gates + build
npm run dup-check    # jscpd: no copy-pasted blocks
npm run format:check
npm run e2e          # Playwright journeys + axe, desktop and a 390×844 phone
bash scripts/preflight.sh   # private files, secrets, banned patterns, casts, encoding, trailers, repository size
```

## House rules

- **GenAI reads and writes; code decides.** Every rupee, date, count, rule and checklist comes from
  `packages/core/src/engine/`. Model output is schema-validated and may only cite numbers and ids the plan contains.
- **Every number says why.** Engines attach a trace (rule id, inputs, source, confidence) to each figure they produce;
  the "Why this?" panel renders it. A new number without a trace is a bug.
- **One source per fact.** Rates, dates and rules live in `packages/core/src/domain/` and cite a registered source
  (publisher, year, confidence grade); input limits live in `packages/core/src/schemas/limits.ts`, each with its reason.
  Never re-type a number the core exports.
- **Errors are values.** Core returns `Result<T, AppError>`; nothing in core throws for expected failures.
- **Tables over branches.** Behaviour per event kind, tradition or category is a table keyed by the union type, so
  adding a case is a compile error until every table handles it.
- **Comments say why.** Every file opens with its responsibility and boundary. No `any`, non-null `!`, casts other than
  `as const`, `console`, TODO or inline lint suppressions. Files stay under 250 lines; components under 150.
- **Tests ride along.** Every change lands with tests in its workspace's `src/__tests__/` folder (core: a test file per
  engine, guard and table; server: supertest against the real app; web: Testing Library per panel). Expected values are
  derived from the code under test, never hand-computed.
- **Accessible by default.** Every control has a name, every status change is announced, nothing depends on colour or
  motion alone, and the strict CSP (no inline styles or scripts) stays strict.
- **Planning help, not a booking or legal service.** Copy informs and prepares; it never books, pays or gives legal
  advice, and dates from almanacs say "confirm with your family priest".

## Reporting security issues

See [SECURITY.md](SECURITY.md).
