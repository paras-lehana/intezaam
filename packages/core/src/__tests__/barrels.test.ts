/**
 * Tests for the package barrels: that every subpath exposes the names other packages code against.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import * as core from '../index.js';
import * as domain from '../domain/index.js';
import * as engine from '../engine/index.js';
import * as exportsBarrel from '../export/index.js';
import * as integrations from '../integrations/index.js';
import * as schemas from '../schemas/index.js';

/** Names other packages code against (SPEC-API "Core public API"). */
const SCHEMA_NAMES = [
  'eventContextSchema',
  'contextPatchSchema',
  'planSchema',
  'briefModelOutputSchema',
  'narrationModelOutputSchema',
  'quoteModelOutputSchema',
  'draftModelOutputSchema',
  'askModelOutputSchema',
  'briefRequestSchema',
  'planRequestSchema',
  'whatIfRequestSchema',
  'quotesRequestSchema',
  'draftRequestSchema',
  'askRequestSchema',
  'briefResponseSchema',
  'planResponseSchema',
  'narrationResponseSchema',
  'quotesResponseSchema',
  'whatIfResponseSchema',
  'askResponseSchema',
  'draftResponseSchema',
  'provenanceSchema',
  'googleServicesResponseSchema',
];

const DOMAIN_NAMES = [
  'EVENT_KINDS',
  'FUNCTION_KINDS',
  'FUNCTION_PROFILES',
  'TRADITIONS',
  'TRADITION_PROFILES',
  'BUDGET_CATEGORIES',
  'CATEGORY_PROFILES',
  'CITY_TIERS',
  'TIER_PROFILES',
  'CITY_TABLE',
  'findCity',
  'VENUE_SETTINGS',
  'DIET_PROFILES',
  'STYLE_TAGS',
  'VENDOR_TYPES',
  'VENDOR_PROFILES',
  'TIMELINE_PHASES',
  'PHASE_LABELS',
  'RULE_IDS',
  'RULES',
  'LANGUAGES',
  'SAMPLE_CONTEXTS',
];

/** The planner API the web and the server call (SPEC-API "[engine]"). */
const ENGINE_NAMES = [
  'buildPlan',
  'normaliseContext',
  'applyPatch',
  'diffPlans',
  'summarisePlanFacts',
];

/** Browser-side export builders (SPEC-API "[export]"). */
const EXPORT_NAMES = [
  'buildIcs',
  'planToCsv',
  'buildShareText',
  'encodeContextForUrl',
  'decodeContextFromUrl',
];

describe('package barrels', () => {
  it('the schemas and domain subpaths expose every contract name', () => {
    for (const name of SCHEMA_NAMES) expect(Object.hasOwn(schemas, name)).toBe(true);
    for (const name of DOMAIN_NAMES) expect(Object.hasOwn(domain, name)).toBe(true);
  });

  it('the root re-exports the subpaths plus the server helpers', () => {
    for (const name of [...SCHEMA_NAMES, ...DOMAIN_NAMES])
      expect(Object.hasOwn(core, name)).toBe(true);
    for (const name of ['ok', 'err', 'appError', 'formatLakh', 'redactPii', 'wrapUntrusted']) {
      expect(Object.hasOwn(core, name)).toBe(true);
    }
    expect(Object.hasOwn(integrations, 'buildMapsSearchUrl')).toBe(true);
  });

  it('the engine and export subpaths expose the planner and the export builders', () => {
    for (const name of ENGINE_NAMES) expect(Object.hasOwn(engine, name)).toBe(true);
    for (const name of EXPORT_NAMES) expect(Object.hasOwn(exportsBarrel, name)).toBe(true);
  });
});
