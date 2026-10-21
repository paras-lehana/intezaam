# Intezaam (इंतज़ाम) — every arrangement for your celebration, in one plan

> **Version 0.1.0** · **Live:** https://intezaam.lehana.in · **Health:** https://intezaam.lehana.in/api/health ·
> Runs on your machine with zero keys: `npm install && npm run build && npm start`

**Intezaam ("arrangements") plans Indian weddings, birthdays and community events from your own details.** Describe the
celebration in English, Hindi or Hinglish, or fill five fields, and it makes the planning decisions for your city,
budget, date and traditions: a verdict on whether the money and the time work, a budget that always adds up, a timeline
counted back from your date, vendor checklists with payment milestones, permissions and safety, and personalised ideas.
Every number shows **why**: the rule, the details of yours it used, and its source.

**GenAI reads and writes; code decides.** Google Gemini turns messy briefs and vendor quotes into structured facts,
writes ideas and messages inside limits the code sets, and explains the plan. Tested, deterministic engines decide every
rupee, date and count, and every number the model writes is checked against them.

## Quick check for evaluators

```bash
curl -s https://intezaam.lehana.in/api/health
# {"status":"ok","version":"0.1.0","ai":{"configured":true,"models":["gemini-3.5-flash-lite","gemini-3.1-flash-lite"]}}
```

The live site has Gemini switched on. To run Intezaam yourself with no keys:

```bash
npm install && npm run build && npm start     # the app and the API on http://localhost:8080
# then, in a second terminal:
curl -s http://localhost:8080/api/health
# {"status":"ok","version":"0.1.0","ai":{"configured":false,"models":[]}}
```

Once the gateway and Gemini settings in `apps/server/.env` are filled in (see [Quick start](#quick-start)), `configured`
becomes `true` and `models` lists `gemini-3.5-flash-lite` and `gemini-3.1-flash-lite`.

1. Open https://intezaam.lehana.in (or http://localhost:8080), press **Start planning**, then the **Jaipur wedding**
   sample (it fills the form but never runs it), then **Plan my celebration**.
2. Open **Why this?** under the verdict: rule id, the inputs it used, the source with its publisher, year and grade.
3. Open **Ask** and type _"Book the caterer for me and pay the advance"_ — it declines and says what it can do instead. Then open
   **What if** and drag the guest count: the plan re-computes in the browser with no network call.
4. With **zero keys**, every planning feature works on the labelled offline planner: the plan, levers, what-ifs, Ask,
   exports, and drafts in English, Hindi or Hinglish. Reading a quote from a photo or PDF, the plan's explanation in
   any language but English, and messages in the other nine languages need Gemini.

## Chosen Vertical

**Celebration and event planning** — a GenAI planning assistant for Indian weddings, birthdays and community events that
covers budgets, timelines, vendor checklists and personalised ideas, and makes its decisions from the family's own
context.

## The problem

Indian celebrations are planned by families, not planners: several functions over several days, many relatives paying,
peak-season prices, lead times measured in months, and rules (noise, permissions, rituals, diets) that nobody writes down
in one place. The scale is large: CAIT counted about 46 lakh weddings worth about ₹6.5 lakh crore in the 1 Nov–14 Dec
2025 season alone ([CAIT, 2025](https://cait.in//images/press-release/pdf_1762754341.pdf)), and weddings routinely run
15–20% over their first estimate ([VelvetKnot, 2026](https://velvetknot.in/indian-wedding-cost-budget-breakdown/)).
Birthdays and society festivals have the same problem at a smaller scale, plus collecting money from many households. A
useful assistant has to make decisions a family can check, not just produce a pleasant checklist.

## The personas

Four "Try a sample" inputs in [`domain/samples.ts`](packages/core/src/domain/samples.ts), dated relative to today so they
never go stale. The last column is what the engine decided for a plan made on 2026-10-21 (re-run with
`buildPlan(sampleContext(id, today), today)`).

| Persona                                                      | Their situation                                                                                   | What Intezaam decides for them                                                                                                                | Engine verdict (2026-10-21)                                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Meena**, parent paying for a Jaipur wedding                | 300 guests, ₹25 L, four functions, an outdoor sangeet with a DJ until 11:30 pm, Jain guests       | Money verdict against Jaipur's published ranges, a compressed peak-season timeline, the 10 pm loudspeaker rule for the sangeet, costed levers | Balanced · Compressed; 222 expected guests, 211-plate guarantee, 60 rooms, 22 vendor checklists |
| **Arjun**, working parent, 7th birthday in Bengaluru         | 25 children and 10 adults, ₹40,000, a garden party in the rainy season                            | Rain plan for an outdoor party, age-right ideas, return-gift and food counts with an RSVP buffer, a do-it-yourself checklist                  | Balanced · On track; 28 expected guests, 9 vendor checklists                                    |
| **Kavita**, society cultural secretary, Ganesh utsav in Pune | 240 flats, 5 days, about 1,200 visitors, a visarjan procession, ₹3.5 L with sponsors and the fund | Per-household contribution after sponsors and the society fund, permissions (pandal, loudspeaker, procession), volunteers and crowd safety    | Balanced · On track · Funded; ₹1,000 a flat on ₹2,40,000 still to raise, 7 permission items     |
| **Lakshmi & Ravi**, their father's 60th in Chennai           | Shashtiabdapurti, 150 guests, many elders, ₹6 L, Tamil traditions, organised from two cities      | Priest and hall lead times, an elder and wheelchair access plan, a satvik menu, the explanation and messages in Tamil (with Gemini)           | Lean · On track; 3 costed levers, 113 expected guests                                           |

## The solution

| Feature                                | What it does for the family                                                                                                                                                                                       | Code                                                                                                                                                                                           | Google service                       |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Brief reader**                       | Type _"2 lakh mein 200 log, Diwali ke baad, Jaipur"_; the fields it understood are shown for review before they fill the form                                                                                     | [`genai/brief-guard.ts`](packages/core/src/genai/brief-guard.ts), [`offline/read-brief.ts`](packages/core/src/offline/read-brief.ts)                                                           | Gemini API                           |
| **Five-field form + samples**          | Event, date (or "not fixed"), city, guests, budget (or "estimate it for me"); more details are optional; the form opens empty                                                                                     | [`components/form`](apps/web/src/components/form)                                                                                                                                              | —                                    |
| **Two-axis verdict**                   | Money (Needs changes · Simple & home-style · Lean · Balanced · Premium) × time (On track · Compressed · Critical), plus funding for community events                                                              | [`engine/verdict.ts`](packages/core/src/engine/verdict.ts), [`engine/verdict-wedding.ts`](packages/core/src/engine/verdict-wedding.ts)                                                         | —                                    |
| **"Why this?" on every number**        | Rule id, the inputs it used, its effect, sources with publisher and year, a confidence grade A–D; grade D says "assumption"                                                                                       | [`engine/trace.ts`](packages/core/src/engine/trace.ts), [`TraceDisclosure.tsx`](apps/web/src/components/features/common/TraceDisclosure.tsx)                                                   | —                                    |
| **Budget that always adds up**         | Category split in basis points, exact-rupee rounding, per function, per guest, contingency floor, GST per line, a bottom-up cost check                                                                            | [`engine/budget.ts`](packages/core/src/engine/budget.ts), [`engine/money-split.ts`](packages/core/src/engine/money-split.ts), [`engine/cost-check.ts`](packages/core/src/engine/cost-check.ts) | —                                    |
| **Costed levers**                      | Fewer guests, an off-peak or weekday date, simpler catering, drop a function; each re-priced through the same engine                                                                                              | [`engine/levers.ts`](packages/core/src/engine/levers.ts)                                                                                                                                       | —                                    |
| **Spend tracker and payment calendar** | Planned, committed and paid per line (warns at 90%), and cash needed per month from vendor milestones                                                                                                             | [`SpendTracker.tsx`](apps/web/src/components/features/money/SpendTracker.tsx), [`engine/payments.ts`](packages/core/src/engine/payments.ts)                                                    | —                                    |
| **Timeline counted back**              | Tasks in phases with due dates; compressed and triaged when time is short; "pick your date" when the date is open; indicative muhurat dates                                                                       | [`engine/timeline.ts`](packages/core/src/engine/timeline.ts), [`engine/dates.ts`](packages/core/src/engine/dates.ts)                                                                           | Google Calendar links, `.ics`        |
| **Functions and run sheet**            | Ceremony sequence per tradition, a budget slice per function, day-of slots with vendor arrival times                                                                                                              | [`engine/functions.ts`](packages/core/src/engine/functions.ts), [`engine/run-sheet.ts`](packages/core/src/engine/run-sheet.ts)                                                                 | —                                    |
| **Vendor checklists**                  | Per vendor: book-by date, questions, what to get in writing, red flags, GST rate, payment milestones, status                                                                                                      | [`engine/vendors.ts`](packages/core/src/engine/vendors.ts), [`domain/vendor-playbook.ts`](packages/core/src/domain/vendor-playbook.ts)                                                         | Google Maps search links             |
| **Quote reader**                       | Paste or photograph up to three quotes; code totals them with GST for your expected guests or the quote's minimum plates, whichever is more, and compares each with its share of your budget; never ranks vendors | [`genai/quote-normalise.ts`](packages/core/src/genai/quote-normalise.ts), [`security/magic-bytes.ts`](packages/core/src/security/magic-bytes.ts)                                               | Gemini API (vision)                  |
| **Message studio**                     | Vendor enquiry, invitation, RSVP reminder, volunteer brief, thank-you: 11 languages with Gemini, English, Hindi or Hinglish offline                                                                               | [`genai/prompts-drafts.ts`](packages/core/src/genai/prompts-drafts.ts), [`offline/drafts.ts`](packages/core/src/offline/drafts.ts)                                                             | Gemini API, Gmail compose links      |
| **Headcount, food and space**          | Expected guests, plate guarantee, cook-for count, rooms, food quantities, Jain and satvik rules, venue capacity                                                                                                   | [`engine/headcount.ts`](packages/core/src/engine/headcount.ts), [`engine/food.ts`](packages/core/src/engine/food.ts)                                                                           | —                                    |
| **Guest list**                         | Add guests or import a CSV or Google Contacts export; Hinglish column names understood; stays on the device                                                                                                       | [`guest-csv.ts`](apps/web/src/components/features/people/guest-csv.ts)                                                                                                                         | Google Contacts CSV                  |
| **Community toolkit**                  | Flat or tiered contribution (chanda) after sponsors and the society fund, a ledger, a volunteer roster by footfall                                                                                                | [`engine/community.ts`](packages/core/src/engine/community.ts), [`engine/community-money.ts`](packages/core/src/engine/community-money.ts)                                                     | —                                    |
| **Permissions and safety**             | Loudspeaker permission, the 10 pm–6 am night ban, pandal, procession, fire, crackers, society approval; crowd checks by footfall                                                                                  | [`engine/permissions.ts`](packages/core/src/engine/permissions.ts), [`engine/safety.ts`](packages/core/src/engine/safety.ts)                                                                   | —                                    |
| **Risk radar and access plan**         | Each risk with severity in words, its cause and the fix; ramps, step-free routes and seating for elders                                                                                                           | [`engine/risks.ts`](packages/core/src/engine/risks.ts), [`domain/accessibility.ts`](packages/core/src/domain/accessibility.ts)                                                                 | —                                    |
| **Personalised ideas**                 | Themes, decor, menu, activities and return gifts inside your diet, season, age and money limits, with cost bands from code                                                                                        | [`genai/idea-guard.ts`](packages/core/src/genai/idea-guard.ts), [`offline/ideas`](packages/core/src/offline/ideas)                                                                             | Gemini API, YouTube search links     |
| **What if**                            | Guests, budget, date, setting or a dropped function: instant re-plan with a diff of numbers and risks; plus what a vendor cancelling would mean                                                                   | [`engine/what-if.ts`](packages/core/src/engine/what-if.ts), [`engine/diff.ts`](packages/core/src/engine/diff.ts)                                                                               | —                                    |
| **Ask Intezaam**                       | Answers from the plan; a change ("add 50 guests") becomes a patch you approve; declines booking, payment and legal advice                                                                                         | [`offline/ask.ts`](packages/core/src/offline/ask.ts), [`genai/ask-check.ts`](packages/core/src/genai/ask-check.ts)                                                                             | Gemini API                           |
| **Share and export**                   | WhatsApp text, print view, CSV for Google Sheets, `.ics`, a share link that carries the plan in the URL fragment, JSON save and restore                                                                           | [`packages/core/src/export`](packages/core/src/export), [`features/share`](apps/web/src/components/features/share)                                                                             | Google Sheets (CSV), Google Calendar |
| **Method and sources**                 | Every source with publisher, year and grade, the assumptions, and the Google services catalogue                                                                                                                   | [`pages/AboutPage.tsx`](apps/web/src/pages/AboutPage.tsx)                                                                                                                                      | —                                    |

## Approach and Logic

**Describe → Decide → Adjust → Act.** The family describes the celebration (a brief in their own words, or five fields);
the planner decides with code; the family adjusts with levers, what-ifs or a question; and acts with checklists, drafts,
calendar entries and share links.

**Decisions are rules with ids, inputs and sources.** [`domain/rule-ids.ts`](packages/core/src/domain/rule-ids.ts)
holds 93 rule ids, and [`domain/rules.ts`](packages/core/src/domain/rules.ts) gives each a title, a summary, a confidence
grade and its sources (a missing rule is a compile error):

| Family            | Ids                                     | What it decides                                                                                              |
| ----------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Context           | CTX-01…08                               | Event family, city tier and anchor, scale, season and weekday, lead time, crowd class, rain risk, tradition  |
| Budget            | BUD-01…09                               | Base split, scale and destination shifts, priorities, optional lines, contingency floor, exact rupees        |
| Cost check        | CST-01…06                               | Per-plate price, service charge, off-peak saving, meals per function, guest rooms, GST                       |
| Verdict           | VER-M, VER-T, VER-F                     | Money band, time status, and funding for community events                                                    |
| Levers            | LEV-01…07                               | Ranked, costed changes recomputed through the same engine                                                    |
| Timeline          | TL-01…11                                | Task templates, due dates, compression, too-late tasks, undated mode, dependencies, buffers, tradition tasks |
| Dates             | DATE-01…05                              | Peak season, indicative muhurat, Chaturmas and Kharmas, other faiths, festival clashes                       |
| Functions         | FN-01…04                                | Function sequence, budget per function, run sheet, rest day                                                  |
| Vendors           | VEN-01…05                               | Vendors needed, book-by dates, playbook, payment milestones, no vendor names                                 |
| People and food   | HC-01…03, FOOD-01, SPACE-01, DIET-01…04 | Expected guests, plates, kids' counts, quantities, venue capacity, Jain, halal, satvik and gurdwara food     |
| Access and safety | ACC-01…06, PERM-01…08, CROWD-01…05      | Ramps, toilets, seating, noise and permission rules, crowd safety by footfall                                |
| Community         | COM-01…05                               | Flat or tiered contribution, ledger, volunteers, charity receipts                                            |
| Cross-cutting     | RISK, READY-01                          | Risk severity ladder, readiness score                                                                        |

The facts behind the rules live in [`packages/core/src/domain`](packages/core/src/domain) with a register of 91 sources
(14 grade A: statute, regulator or official guidance; 29 grade B; 46 grade C; 2 grade D). Each trace item names the rule,
the inputs it used and its effect.

**Why five money bands for weddings.** Needs changes · Simple & home-style · Lean · Balanced · Premium, contiguous so
every budget lands in exactly one. Published planner ranges start well above what a typical Indian family spends, so a
family below them is planning a simpler wedding (a home, community hall or dharamshala with a local caterer), not an
infeasible one. The copy never says "not feasible"; the levers say what would change the band.

**Community events are judged on funding**: the planned spend is split by budget heads and checked against
contributions, sponsors and the society fund, giving Funded, a gap in rupees, or a surplus.

## How the Solution Works

```
brief (EN / HI / Hinglish) ─► Gemini: brief reader ─► fields + evidence quotes ─► code checks each quote is in the brief
                                                                                        │
five fields / sample ───────────────────────────────────────────────────────────────────┤
                                                                                        ▼
                                        engines (pure TypeScript, run in the browser) ─► plan + trace + sources
                                                                                        │
                    Gemini: narrator (1 call, numbered facts only) ◄────────────────────┤
                    faithfulness guard swaps any sentence with a number not in the plan ▼
                                                                         workspace tabs: Overview · Money · Timeline ·
what-if ─► applyPatch + buildPlan (instant, no model call) ─► diff          Vendors · People · Ideas · Safety · Share
quote photo / PDF ─► magic-byte check ─► Gemini transcribes ─► code adds GST, bills at least the minimum plates, vs its budget share
ask ─► rules answer first ─► else Gemini on plan facts ─► a change becomes a patch you approve
no model available ─► the labelled offline planner returns the same shapes
```

The same core package runs in the browser (instant plans and what-ifs) and on the server (which recomputes the plan from
the posted context for every AI route and never trusts client numbers). Details: [ARCHITECTURE.md](ARCHITECTURE.md).

## Assumptions Made

- Estimates come from published 2024–2026 sources and are labelled by confidence; grade-D values are our own
  assumptions and every one is editable. Estimates are not quotes: get three written quotes before you book.
- Muhurat dates are indicative (North Indian panchang for New Delhi) and curated for November 2026 to December 2027;
  outside that window the plan says so. Confirm with your family priest.
- Permissions and noise rules vary by state and city; each item says to verify with your local police and municipal
  office. The 10 pm–6 am loudspeaker rule (Noise Pollution Rules, 2000) is the only rule treated as a blocker.
- A city not in the 69-city table is treated as tier 2, and the trace says so.
- A tradition is never inferred: it comes only from what the family states.
- Plans live in the browser. Guest lists, the spend tracker and the ledger never leave the device.
- On the Gemini API free tier Google may use prompts and responses to improve its products, so Intezaam redacts personal
  details from typed and pasted text before every call and never sends guest names. A quote photo or PDF the family
  chooses to upload is sent as-is to be transcribed; the upload control says so and asks them to crop out phone numbers
  and bank details first.

## Problem Statement Alignment

| What the challenge asks for                   | Where Intezaam does it                                                                                                         | Code                                                                                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plans weddings                                | 9 traditions plus civil, function sequences, muhurat and Chaturmas dates, five money bands                                     | [`domain/traditions.ts`](packages/core/src/domain/traditions.ts), [`engine/verdict-wedding.ts`](packages/core/src/engine/verdict-wedding.ts)                         |
| Plans birthdays                               | First, kids', teen, milestone and 60th birthdays: age-right ideas, return gifts, kids' counts                                  | [`domain/tasks-birthday.ts`](packages/core/src/domain/tasks-birthday.ts), [`offline/ideas/library-birthday.ts`](packages/core/src/offline/ideas/library-birthday.ts) |
| Plans community events                        | Pandals, society festivals, satsangs, RWA functions, fundraisers: chanda, permissions, crowd, volunteers                       | [`engine/community.ts`](packages/core/src/engine/community.ts), [`engine/permissions.ts`](packages/core/src/engine/permissions.ts)                                   |
| Budgets                                       | Exact-rupee split, per function and guest, cost check, GST, levers, spend tracker, payment calendar                            | [`engine/budget.ts`](packages/core/src/engine/budget.ts), [`engine/levers.ts`](packages/core/src/engine/levers.ts)                                                   |
| Timelines                                     | Back-scheduled tasks, compression, run sheet, Google Calendar links and `.ics`                                                 | [`engine/timeline.ts`](packages/core/src/engine/timeline.ts), [`export/ics.ts`](packages/core/src/export/ics.ts)                                                     |
| Vendor checklists                             | Per vendor questions, deliverables, red flags, payments, book-by dates; quote reader                                           | [`engine/vendors.ts`](packages/core/src/engine/vendors.ts), [`features/vendors`](apps/web/src/components/features/vendors)                                           |
| Ideas personalised to the family              | Gemini ideas inside diet, alcohol, season, age and money limits; a curated offline library of 80 ideas                         | [`genai/idea-guard.ts`](packages/core/src/genai/idea-guard.ts), [`offline/ideas/select-ideas.ts`](packages/core/src/offline/ideas/select-ideas.ts)                   |
| An assistant that adapts as details change    | Ask with grounded answers and approved patches; what-if re-plans instantly                                                     | [`services/ask-service.ts`](apps/server/src/services/ask-service.ts), [`features/what-if`](apps/web/src/components/features/what-if)                                 |
| Decisions that follow from the user's context | 93 rule ids with inputs, effects and sources; "Why this?" on every number                                                      | [`domain/rules.ts`](packages/core/src/domain/rules.ts), [`engine/trace.ts`](packages/core/src/engine/trace.ts)                                                       |
| Usable in real life                           | Zero keys to plan, WhatsApp, Sheets, Gmail, Maps, share links, messages in 11 languages with Gemini, phone layout, WCAG 2.2 AA | [`packages/core/src/integrations`](packages/core/src/integrations), [ACCESSIBILITY.md](ACCESSIBILITY.md)                                                             |
| Clean, maintainable code                      | Pure core, `Result` errors, tables keyed by closed unions, one schema per contract                                             | [EVALUATION_MAPPING.md](EVALUATION_MAPPING.md)                                                                                                                       |

## GenAI Architecture

Google Gemini (`gemini-3.5-flash-lite`, failing over to `gemini-3.1-flash-lite`) on the Gemini API free tier,
server-side only, through an OpenAI-compatible LLM gateway; the labelled offline planner takes over when no model
answers. Five jobs, each with a prompt builder, a zod output schema, code-enforced guardrails and an offline twin:

| #   | Job          | Endpoint                                                                       | What code enforces                                                                    |
| --- | ------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| 1   | Brief reader | `POST /api/brief`                                                              | Every field needs an evidence quote found in the brief; numbers are parsed by code    |
| 2   | Narrator     | `POST /api/plan`, `POST /api/plan/narration` (narration only, for the browser) | One call per distinct plan; any sentence with a number not in the plan is replaced    |
| 3   | Quote reader | `POST /api/quotes/read`, `/api/quotes/compare`                                 | Magic-byte file check; amounts, GST and totals by code; no ranking                    |
| 4   | Drafts       | `POST /api/drafts`                                                             | Numbers and dates only from the plan; no guest data sent                              |
| 5   | Ask          | `POST /api/ask`                                                                | Rules answer first; refusals enforced; changes are validated patches the user applies |

Every AI response carries provenance ("Explained by Gemini · model · seconds" or "Offline planner" with the reason).
Details: [GENAI_ARCHITECTURE.md](GENAI_ARCHITECTURE.md).

## Google services

From the one catalog constant, [`google/service-catalog.ts`](packages/core/src/google/service-catalog.ts), which also
feeds `GET /api/google/services` and the About page. 8 implemented, 5 declined, all at zero cost under the strict CSP.

| Service                                                                          | Status      | What it does here                                                                                  |
| -------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------- |
| Google Gemini API (gemini-3.5-flash-lite, failing over to gemini-3.1-flash-lite) | implemented | Reads briefs and quotes, explains the plan with ideas, drafts messages, answers questions          |
| Gemini structured output (JSON Schema)                                           | implemented | A JSON Schema generated from the zod contract travels with every request; replies are re-validated |
| Google Calendar event links and iCalendar (.ics) export                          | implemented | Each timeline task opens a pre-filled Calendar event; the whole plan downloads as `.ics`           |
| Google Maps URLs (search and directions)                                         | implemented | Each vendor checklist links to a Maps search in the event city; no API key                         |
| Google Sheets (CSV import)                                                       | implemented | Budget, timeline and vendor tables as CSV with the formula-injection guard                         |
| Gmail compose links                                                              | implemented | A drafted enquiry opens in Gmail with subject and body (mailto: fallback)                          |
| YouTube search links                                                             | implemented | Each idea links to a tutorial search; code builds the link, never the model                        |
| Google Fonts, self-hosted (Cormorant Garamond, Outfit, Noto Sans Devanagari)     | implemented | Served from our own origin so the CSP stays `font-src 'self'`                                      |
| Maps Embed API                                                                   | declined    | Needs a billed key and a frame exception; a Maps link does the job                                 |
| Maps JavaScript API and Places API                                               | declined    | External scripts (and `unsafe-eval`) break the strict CSP; billed per call                         |
| Vertex AI, Cloud Translation and Cloud Text-to-Speech                            | declined    | Paid; the Gemini API free tier already writes all 11 languages                                     |
| Google Analytics 4, reCAPTCHA and Sign in with Google                            | declined    | External scripts under the CSP, and there are no accounts to sign in to                            |
| Cloud Run                                                                        | declined    | Self-hosted in one container at zero cost for v1                                                   |

## Tech stack

| Layer    | Choice                                                                                                                                   |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Language | TypeScript 6 (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), ESM                                                     |
| Domain   | `packages/core`: pure functions and zod 4 schemas shared by server, web and AI-output validation                                         |
| Server   | Node 24, Express 5, helmet, compression; one container serves the API and the web build on the same origin                               |
| Web      | React 19, Vite 8, React Router 7, plain CSS tokens (no inline styles), self-hosted fonts, route and tab code splitting                   |
| Testing  | Vitest 5, Testing Library, supertest, Playwright + axe-core                                                                              |
| Quality  | ESLint 9 (typescript-eslint strict, jsx-a11y strict, zero warnings), Prettier, jscpd (threshold 0)                                       |
| Delivery | Multi-stage [`Dockerfile`](Dockerfile) (non-root), self-hosted behind Cloudflare and Traefik; CI in [`ci.yml`](.github/workflows/ci.yml) |

## Quick start

```bash
npm install
npm test          # core + server + web suites
npm run build     # core → web → server
npm start         # http://localhost:8080 — the offline planner answers with no keys
```

To switch on Gemini, copy [`.env.example`](.env.example) to `apps/server/.env` and set the gateway URL, the gateway key
and a Gemini API key from a project with no billing account; every variable is documented there. `npm run verify` runs
type-check, lint, tests with coverage gates and the build; `npm run e2e` runs the Playwright journeys and axe scans.

**Latest local run (2026-10-21):** 2,075 unit, integration and component tests pass (core 1,391 · server 172 · web 512)
plus 46 Playwright tests. Details in [TESTING.md](TESTING.md).

## For evaluators

[ARCHITECTURE.md](ARCHITECTURE.md) · [GENAI_ARCHITECTURE.md](GENAI_ARCHITECTURE.md) · [SECURITY.md](SECURITY.md) ·
[TESTING.md](TESTING.md) · [ACCESSIBILITY.md](ACCESSIBILITY.md) · [EVALUATION_MAPPING.md](EVALUATION_MAPPING.md) ·
[CHANGELOG.md](CHANGELOG.md) · [CONTRIBUTING.md](CONTRIBUTING.md)

## License

MIT — see [LICENSE](LICENSE).

> **Disclaimer:** Intezaam gives planning estimates and checklists, not quotes, bookings or legal advice. Dates from
> almanacs are indicative; confirm them with your family priest, and confirm permissions with your local police and
> municipal office.
