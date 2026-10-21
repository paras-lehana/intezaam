# Accessibility

**Target:** WCAG 2.2 Level AA. The people planning an Indian celebration include grandparents, relatives reading in a
second language, and parents on a phone between other jobs, so the interface is built for keyboards, screen readers,
zoom and small screens first.

## Decisions and evidence

| Decision                                                                                                                                                            | Implementation                                                                                                                                                 | WCAG                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Skip link to the main content; `header`, `nav`, `main` and `footer` landmarks                                                                                       | [`Layout.tsx`](apps/web/src/components/layout/Layout.tsx)                                                                                                      | 2.4.1, 1.3.1        |
| One `h1` per page, then `h2` and `h3` in order; the page title follows the route                                                                                    | [`pages`](apps/web/src/pages), [`use-page-title.ts`](apps/web/src/lib/use-page-title.ts)                                                                       | 1.3.1, 2.4.2, 2.4.6 |
| Every field has a visible label; hints and errors are tied with `aria-describedby` and `aria-invalid`; single choices are native radios in a fieldset with a legend | [`FieldShell.tsx`](apps/web/src/components/form/FieldShell.tsx), [`ChoiceGroup.tsx`](apps/web/src/components/ui/ChoiceGroup.tsx)                               | 1.3.1, 3.3.1, 3.3.2 |
| On submit, the first invalid field is scrolled into view and focused (inside "More details" too); an empty submission shows an accessible error                     | [`use-planner-form.ts`](apps/web/src/components/form/use-planner-form.ts), [`form-fields.ts`](apps/web/src/components/form/form-fields.ts)                     | 3.3.1, 2.4.3        |
| A new plan, a recalculation and a filled form are announced through a live region that exists from the first render                                                 | [`LiveRegion.tsx`](apps/web/src/components/ui/LiveRegion.tsx), [`lib/plan-state.ts`](apps/web/src/lib/plan-state.ts)                                           | 4.1.3               |
| Focus moves to the plan heading when a plan is built or restored                                                                                                    | [`PlanPage.tsx`](apps/web/src/pages/PlanPage.tsx)                                                                                                              | 2.4.3               |
| Workspace tabs follow the WAI-ARIA tabs pattern: roving tabindex, Arrow keys (wrapping), Home and End, `aria-controls` and `aria-labelledby`                        | [`Tabs.tsx`](apps/web/src/components/ui/Tabs.tsx)                                                                                                              | 2.1.1, 4.1.2        |
| What if and Ask are non-modal disclosures; Escape closes them and returns focus to the button that opened them                                                      | [`use-close-on-escape.ts`](apps/web/src/components/features/what-if/use-close-on-escape.ts)                                                                    | 2.1.2, 2.4.3        |
| "Why this?" is a real button with `aria-expanded` and a name that says what it explains ("Why this? Venue and rentals")                                             | [`TraceDisclosure.tsx`](apps/web/src/components/features/common/TraceDisclosure.tsx)                                                                           | 2.4.6, 4.1.2        |
| Severity is never colour alone: every risk shows words and a distinct glyph, so it also reads in greyscale and print                                                | [`SeverityLabel.tsx`](apps/web/src/components/features/common/SeverityLabel.tsx)                                                                               | 1.4.1               |
| Grade-D values say "Assumption (you can change it)" in words next to the number                                                                                     | [`ConfidenceLabel.tsx`](apps/web/src/components/features/common/ConfidenceLabel.tsx), [`source-types.ts`](packages/core/src/domain/source-types.ts)            | 1.3.3, 3.3.2        |
| Budget bars are a visual companion only; the table beside them carries every number; wide tables scroll in a named, keyboard-focusable region                       | [`BudgetBars.tsx`](apps/web/src/components/features/money/BudgetBars.tsx), [`TableScroll.tsx`](apps/web/src/components/features/common/TableScroll.tsx)        | 1.1.1, 2.1.1        |
| The readiness score is a native `<meter>` with the score in words                                                                                                   | [`ReadinessScore.tsx`](apps/web/src/components/features/overview/ReadinessScore.tsx)                                                                           | 1.3.1, 4.1.2        |
| Busy buttons use `aria-disabled` with a guard instead of `disabled`, so they stay focusable and announced                                                           | [`QuoteReader.tsx`](apps/web/src/components/features/vendors/QuoteReader.tsx)                                                                                  | 4.1.2               |
| Visible focus ring on every interactive element, with its own token on the ivory pages and on the espresso cover                                                    | [`tokens.css`](apps/web/src/styles/tokens.css), [`base.css`](apps/web/src/styles/base.css)                                                                     | 2.4.7, 2.4.11       |
| Touch targets of at least 44 × 44 CSS px (`--touch-target`)                                                                                                         | [`tokens.css`](apps/web/src/styles/tokens.css)                                                                                                                 | 2.5.8 (and 2.5.5)   |
| `prefers-reduced-motion` honoured, plus a header button that pauses all decorative motion and is remembered                                                         | [`primitives.css`](apps/web/src/styles/primitives.css), [`MotionToggle.tsx`](apps/web/src/components/layout/MotionToggle.tsx)                                  | 2.3.3, 2.2.2        |
| Light and dark themes from the system preference, with a toggle (`aria-pressed`)                                                                                    | [`ThemeToggle.tsx`](apps/web/src/components/layout/ThemeToggle.tsx), [`lib/preferences.ts`](apps/web/src/lib/preferences.ts)                                   | 1.4.3               |
| Phone layout: a "Details \| Plan" switch shows one pane at a time below 64 rem; both panes stay mounted, so nothing resets                                          | [`PlanSplit.tsx`](apps/web/src/components/layout/PlanSplit.tsx), [`SplitSwitch.tsx`](apps/web/src/components/layout/SplitSwitch.tsx)                           | 1.4.10              |
| `lang="en"` on the document and `lang` on Hindi text and on drafts in any of the 11 languages; Noto Sans Devanagari is self-hosted                                  | [`index.html`](apps/web/index.html), [`DraftResult.tsx`](apps/web/src/components/features/ideas/DraftResult.tsx), [`fonts.css`](apps/web/src/styles/fonts.css) | 3.1.1, 3.1.2        |
| `eslint-plugin-jsx-a11y` (strict) in the zero-warning lint gate                                                                                                     | [`eslint.config.js`](eslint.config.js)                                                                                                                         | —                   |
| axe-core scans of `/`, `/plan`, `/about` and every workspace tab, in both themes, on desktop and a 390×844 phone; 16 of 16 scans passed on 2026-10-21               | [`e2e/a11y.spec.ts`](e2e/a11y.spec.ts)                                                                                                                         | 2.0 / 2.1 / 2.2 AA  |

## Token contrast (computed)

Light ivory pages are the default and dark espresso pages the alternative; the header, hero and footer are an espresso
"cover" in both themes. Ratios were computed on 2026-10-21 with the WCAG 2.x relative-luminance formula from the hex
values in [`tokens.css`](apps/web/src/styles/tokens.css); translucent colours are composited over their background
first. The "lowest" column is the worst case across the page, alternate page, card, selected-tab and selected-chip
backgrounds.

**Text on pages (needs 4.5:1; the house target is 6:1)**

| Text token       | Light     | On page | Lowest (light) | Dark      | On page | Lowest (dark) |
| ---------------- | --------- | ------- | -------------- | --------- | ------- | ------------- |
| Ink (headings)   | `#160f04` | 17.92:1 | 16.20:1        | `#fbf3e2` | 17.23:1 | 12.76:1       |
| Body text        | `#3a2210` | 13.97:1 | 12.63:1        | `#f3e9d8` | 15.81:1 | 11.71:1       |
| Muted text       | `#665540` | 6.73:1  | 6.09:1         | `#bfae92` | 8.77:1  | 6.50:1        |
| Gold text, links | `#74501a` | 6.81:1  | 6.16:1         | `#e8b85a` | 10.36:1 | 7.67:1        |
| Rose text        | `#8e3f30` | 6.81:1  | 6.16:1         | `#e9a28e` | 9.08:1  | 6.72:1        |
| Success          | `#1f5e3a` | 7.27:1  | 6.58:1         | `#6fc69a` | 9.26:1  | 6.85:1        |
| Info             | `#1a4a7a` | 8.59:1  | 7.76:1         | `#8db8e8` | 9.20:1  | 6.81:1        |
| Danger           | `#9b1c13` | 7.70:1  | 6.96:1         | `#f08a7e` | 7.83:1  | 5.80:1        |

**Status chips, cover and buttons**

| Pair                                    | Light                              | Ratio            | Dark                    | Ratio   |
| --------------------------------------- | ---------------------------------- | ---------------- | ----------------------- | ------- |
| Danger on its soft fill                 | `#9b1c13` on `#fbe9e6`             | 6.97:1           | `#f08a7e` on `#3b1712`  | 6.56:1  |
| Success on its soft fill                | `#1f5e3a` on `#e7f2ea`             | 6.72:1           | `#6fc69a` on `#12301f`  | 6.96:1  |
| Cover text on the cover                 | `#f3e9d8` on `#160f04`             | 15.81:1          | `#f3e9d8` on `#0c0800`  | 16.62:1 |
| Dimmed cover text (72%) on the cover    | composited on `#160f04`            | 8.47:1           | composited on `#0c0800` | 8.69:1  |
| Gold cover text on the cover            | `#e8b85a` on `#160f04`             | 10.36:1          | `#e8b85a` on `#0c0800`  | 10.89:1 |
| Call-to-action ink on the gold gradient | `#1a1208` on `#e8b85a` → `#c9943c` | 10.08:1 → 6.87:1 | same                    | same    |

**Non-text (needs 3:1)**

| Pair                    | Light                  | Ratio   | Dark                   | Ratio   |
| ----------------------- | ---------------------- | ------- | ---------------------- | ------- |
| Input border on page    | `#a87a2c` on `#faf8f3` | 3.61:1  | `#c9943c` on `#160f04` | 7.05:1  |
| Focus ring on card      | `#a87a2c` on `#ffffff` | 3.83:1  | `#e8b85a` on `#221a0a` | 9.37:1  |
| Focus ring on the cover | `#e8b85a` on `#160f04` | 10.36:1 | `#e8b85a` on `#0c0800` | 10.89:1 |

Gold `#c9943c` is decoration only on the ivory pages (2.54:1); it never carries text there.

## Keyboard map

| Context               | Keys                             | Behaviour                                                                     |
| --------------------- | -------------------------------- | ----------------------------------------------------------------------------- |
| Any page              | `Tab` / `Shift+Tab`              | Skip link first, then header navigation, then content in reading order        |
| Workspace tabs        | `←` / `→`, `Home` / `End`        | Moves between tabs (wrapping); the panel follows the selected tab             |
| Radio and chip groups | Arrow keys                       | Native radio behaviour inside each labelled fieldset                          |
| What if, Ask          | `Enter` / `Space` to open, `Esc` | Opens the tool; Escape closes it and returns focus to its button              |
| "Why this?"           | `Enter` / `Space`                | Expands or collapses the trace behind a number                                |
| Wide tables           | `Tab` to the table, arrow keys   | Scrolls the table inside its card                                             |
| Theme and motion      | `Enter` / `Space`                | Toggles dark mode or pauses decorative motion; the pressed state is announced |
| Forms                 | `Enter` on the submit button     | Validates, then focuses the first field that needs fixing                     |
