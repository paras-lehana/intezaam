/**
 * The Google services catalog: the single source for the README table, GET
 * /api/google/services and the About page (synthesis §6; SPEC-MVP addendum item 11).
 *
 * Responsibility: one honest entry per Google service — exact name, status `implemented`
 * (code and a test exist) or `declined` (with the reason in `purpose`), what it does for a
 * family planning a celebration, the files that implement it, and the NAMES of any
 * environment variables. Every service listed costs nothing and keeps the strict CSP.
 * Boundary: data only; it never carries secret values, and a test checks every code path
 * exists so the catalog cannot claim code that is not there.
 */
import type { GoogleServiceEntry } from '../schemas/google-services.js';

const LINKS = 'packages/core/src/integrations/google-links.ts';

/** Implemented first, then declined, so the About page reads "what we use" before "what we chose not to". */
export const GOOGLE_SERVICES: readonly GoogleServiceEntry[] = [
  {
    id: 'gemini-api',
    name: 'Google Gemini API (gemini-3.5-flash-lite, failing over to gemini-3.1-flash-lite)',
    status: 'implemented',
    purpose:
      'Reads Hinglish briefs, explains the plan with personalised ideas, reads vendor quotes, drafts messages in 11 languages and answers questions, server-side on the free tier through an OpenAI-compatible LLM gateway. Code checks every reply; an offline planner takes over when no model answers.',
    codePaths: [
      'packages/core/src/genai/prompts-brief.ts',
      'packages/core/src/genai/prompts-narration.ts',
      'packages/core/src/genai/faithfulness.ts',
      'apps/server/src/services/genai-client.ts',
      'apps/server/src/services/llm-service-caller.ts',
    ],
    envVars: [
      'LLM_SERVICE_URL',
      'LLM_SERVICE_KEY',
      'LLM_UPSTREAM_URL',
      'LLM_UPSTREAM_KEY',
      'LLM_MODELS',
      'LLM_DAILY_LIMITS',
    ],
  },
  {
    id: 'gemini-structured-output',
    name: 'Gemini structured output (JSON Schema)',
    status: 'implemented',
    purpose:
      'Every request carries a JSON Schema generated from the same zod contract that validates the reply, so a malformed answer is caught before it reaches the screen.',
    codePaths: [
      'packages/core/src/genai/model-schema.ts',
      'packages/core/src/schemas/model-outputs.ts',
    ],
    envVars: [],
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar event links and iCalendar (.ics) export',
    status: 'implemented',
    purpose:
      'Each task in the timeline opens a pre-filled Google Calendar event, and the whole plan downloads as an .ics file with every function and deadline.',
    codePaths: [LINKS, 'packages/core/src/export/ics.ts'],
    envVars: [],
  },
  {
    id: 'google-maps-urls',
    name: 'Google Maps URLs (search and directions)',
    status: 'implemented',
    purpose:
      'Every vendor checklist links to a Maps search for that vendor type in the event city, and the same builder makes directions links (two-wheeler mode included). No API key.',
    codePaths: [LINKS, 'packages/core/src/engine/vendors.ts'],
    envVars: [],
  },
  {
    id: 'google-sheets-csv',
    name: 'Google Sheets (CSV import)',
    status: 'implemented',
    purpose:
      'The budget, timeline and vendor tables download in CSV for Google Sheets, with the OWASP formula-injection guard on every cell.',
    codePaths: ['packages/core/src/export/csv.ts'],
    envVars: [],
  },
  {
    id: 'gmail-compose',
    name: 'Gmail compose links',
    status: 'implemented',
    purpose:
      'A drafted vendor enquiry opens in Gmail with subject and body filled in (with a mailto: fallback), so the family sends it from their own account.',
    codePaths: [LINKS],
    envVars: [],
  },
  {
    id: 'youtube-search',
    name: 'YouTube search links',
    status: 'implemented',
    purpose:
      'Each decoration, food or games idea links to a YouTube search for a tutorial; code builds the link, never the model.',
    codePaths: [LINKS, 'packages/core/src/genai/idea-guard.ts'],
    envVars: [],
  },
  {
    id: 'google-fonts',
    name: 'Google Fonts, self-hosted (Cormorant Garamond, Outfit, Noto Sans Devanagari)',
    status: 'implemented',
    purpose:
      'Display, body and Hindi text use Google Fonts served from our own origin, so the CSP stays font-src self.',
    codePaths: ['apps/web/src/styles/fonts.css', 'apps/web/package.json'],
    envVars: [],
  },
  {
    id: 'maps-embed-api',
    name: 'Maps Embed API',
    status: 'declined',
    purpose:
      'Declined: it needs an API key tied to a billing account and a frame-src exception; a Maps link does the same job for free.',
    codePaths: [],
    envVars: [],
  },
  {
    id: 'maps-javascript-places',
    name: 'Maps JavaScript API and Places API',
    status: 'declined',
    purpose:
      'Declined: they load external scripts (Maps JavaScript also needs unsafe-eval), which the strict CSP forbids, and they are billed per call.',
    codePaths: [],
    envVars: [],
  },
  {
    id: 'vertex-ai-cloud-ml',
    name: 'Vertex AI, Cloud Translation and Cloud Text-to-Speech',
    status: 'declined',
    purpose: 'Declined: paid services; the Gemini API free tier already writes all 11 languages.',
    codePaths: [],
    envVars: [],
  },
  {
    id: 'analytics-recaptcha-sign-in',
    name: 'Google Analytics 4, reCAPTCHA and Sign in with Google',
    status: 'declined',
    purpose:
      'Declined: each needs an external script under the CSP, and the app stores no accounts or plans on a server, so there is nothing to sign in to.',
    codePaths: [],
    envVars: [],
  },
  {
    id: 'cloud-run',
    name: 'Cloud Run',
    status: 'declined',
    purpose:
      'Declined for v1: the app is self-hosted in one container at zero cost; Cloud Run would need a billing account.',
    codePaths: [],
    envVars: [],
  },
];
