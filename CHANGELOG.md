# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-10-20

First public release: a GenAI planning assistant for Indian weddings, birthdays and community events, built around the
rule "GenAI reads and writes; code decides".

### Added

- **Planning engine** (`packages/core`, pure TypeScript, runs in the browser and on the server): `buildPlan(context,
todayIso)` returns a validated plan with a two-axis verdict (money × time, plus funding for community events), an
  exact-rupee budget by category, function and guest, a bottom-up cost check with GST per line, costed levers, a
  back-scheduled timeline with compression and undated modes, functions and a day-of run sheet, vendor checklists with
  payment milestones, headcount, food, space, diet and access plans, permissions, crowd safety, community contributions,
  risks and a readiness score.
- **Explainability:** 93 rule ids, each with a title, summary, confidence grade and sources; a trace item (rule, inputs,
  effect, sources) behind every number; a register of 91 sources graded A–D, with grade D labelled as an assumption.
- **Domain data:** 4 event families and 18 kinds, 9 wedding traditions plus civil, 69 cities with tiers and wet months,
  34 vendor types, 21 budget categories, 109 task templates, indicative muhurat dates for November 2026 to December
  2027, Chaturmas and Kharmas windows and festival dates, 11 languages, and four persona samples dated relative to today.
- **Five Gemini jobs** (server-side, Gemini API free tier through an OpenAI-compatible LLM gateway): brief reader
  (`POST /api/brief`), narrator with personalised ideas (`POST /api/plan`, and `POST /api/plan/narration`, which returns
  the narration alone to the browser that already built the plan), quote reader (`POST /api/quotes/read`,
  `POST /api/quotes/compare`), drafts in 11 languages (`POST /api/drafts`) and Ask with approved patches
  (`POST /api/ask`). Each has code-enforced guards (evidence quotes, faithfulness, idea limits, quote maths, refusals)
  and an offline twin with the same shape; every response carries provenance. Offline, drafts come in English, Hindi
  or Hinglish, the narration in English, and reading a quote from a photo or PDF needs Gemini.
- **Model chain:** `gemini-3.5-flash-lite`, failing over to `gemini-3.1-flash-lite`, 45 s per attempt, a per-model daily
  budget (`LLM_DAILY_LIMITS`, default 450 each) reset at midnight Pacific time, and offline reasons `daily_quota`,
  `upstream_error` and `not_configured`.
- **Web app** (React 19, Vite 8): home page with a feature bento, a five-field form with a brief box and four samples
  that fill but never run, a workspace with Overview, Money, Timeline, Vendors, People, Ideas, Safety and Share tabs,
  What if and Ask drawers, "Why this?" on every number, an About page with the pipeline, sources, assumptions and the
  Google services catalogue; light and dark themes; phone layout with a Details | Plan switch.
- **Exports and Google links:** `.ics` and Google Calendar links, CSV for Google Sheets with the formula-injection guard,
  Maps search links per vendor, Gmail compose for enquiries, YouTube search per idea, WhatsApp text, print view, share
  links that carry the plan in the URL fragment, and JSON save and restore.
- **Device-only tools:** guest list with CSV and Google Contacts import, spend tracker, community ledger, style quiz and
  couple hashtags.
- **Security:** strict CSP without `unsafe-inline`, HSTS preload, Permissions-Policy, magic-byte upload validation, PII
  redaction, Unicode sanitiser including bidi isolates, nonce-fenced prompts, an outbound allow-list with a fail-closed
  startup self-test, Cloudflare-aware rate-limit keys, abort on client disconnect.
- **Delivery:** one multi-stage Docker image (non-root) serving the API and the web build on one origin; CI with
  SHA-pinned actions running audit, type-check, lint, formatting, duplication, tests with coverage, build and the
  Playwright suite.

### Verified

- `npm run test:coverage` (2026-10-21): 2,074 tests pass — core 1,390 (172 files), server 172 (18 files), web 512 (98
  files). Coverage: core 99.92% lines / 95.77% branches; server 99.7% lines / 94.02% branches; web 98.45% lines /
  87.74% branches.
- `npx playwright test`: 46 of 46 pass (11 journeys, 4 persona checks and 8 axe scans on each of desktop and a 390×844
  phone) against the production build with the offline planner.
- `npm run type-check`, `npm run lint` (zero warnings), `npm run dup-check` (0 clones) and `npm audit` (0
  vulnerabilities) pass.
