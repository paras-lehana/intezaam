/**
 * Tests for the server-only barrels (genai, offline, security) and their root re-exports.
 *
 * Responsibility: every server-only name the public API lists — the five prompt builders, the five
 * offline twins, the code guards and the input-hygiene helpers — is exported from its barrel
 * and from the package root, and the browser-safe export and integrations subpaths carry
 * the link builders. Boundary: names only; behaviour is tested per module.
 */
import { describe, expect, it } from 'vitest';
import * as core from '../index.js';
import * as exportsBarrel from '../export/index.js';
import * as genai from '../genai/index.js';
import * as integrations from '../integrations/index.js';
import * as offline from '../offline/index.js';
import * as security from '../security/index.js';

/** Server-only prompt builders, guards and helpers. */
const GENAI_NAMES = [
  'buildBriefPrompt',
  'buildNarrationPrompt',
  'buildQuotePrompt',
  'buildDraftPrompt',
  'buildAskPrompt',
  'validateBriefDraft',
  'checkNarrationFaithfulness',
  'enforceIdeaConstraints',
  'normaliseQuotes',
  'applyAskPatch',
  'checkAskReply',
  'checkDraftFaithfulness',
  'toModelSchema',
  'ideaConstraintsFor',
  'buildDraftFacts',
  'matchesLanguageScript',
];

/** The offline twins, returning the model-output shapes. */
const OFFLINE_NAMES = [
  'readBriefOffline',
  'narrateOffline',
  'compareQuotesOffline',
  'draftOffline',
  'askOffline',
  'askByRules',
];

const SECURITY_NAMES = ['sanitizeUserText', 'foldForMatch', 'quoteFileSchema', 'sniffFileType'];

/** Link builders on the browser-safe integrations subpath. */
const LINK_NAMES = [
  'buildGoogleCalendarUrl',
  'buildMapsSearchUrl',
  'buildMapsDirectionsUrl',
  'buildGmailComposeUrl',
  'buildYoutubeSearchUrl',
  'buildWhatsAppUrl',
  'hashtagBlends',
];

describe('server-only barrels', () => {
  it('export every GenAI, offline and security name from their barrels', () => {
    for (const name of GENAI_NAMES) expect(Object.hasOwn(genai, name), name).toBe(true);
    for (const name of OFFLINE_NAMES) expect(Object.hasOwn(offline, name), name).toBe(true);
    for (const name of SECURITY_NAMES) expect(Object.hasOwn(security, name), name).toBe(true);
  });

  it('re-export them, plus redaction, fencing and the Google catalog, from the package root', () => {
    for (const name of [...GENAI_NAMES, ...OFFLINE_NAMES, ...SECURITY_NAMES, ...LINK_NAMES]) {
      expect(Object.hasOwn(core, name), name).toBe(true);
    }
    for (const name of ['redactPii', 'wrapUntrusted', 'GOOGLE_SERVICES', 'buildIcs', 'planToCsv']) {
      expect(Object.hasOwn(core, name), name).toBe(true);
    }
  });

  it('keep the link builders and exports on their browser-safe subpaths', () => {
    for (const name of LINK_NAMES) expect(Object.hasOwn(integrations, name), name).toBe(true);
    expect(Object.hasOwn(exportsBarrel, 'buildShareText')).toBe(true);
    expect(Object.hasOwn(exportsBarrel, 'buildGmailComposeUrl')).toBe(false);
  });
});
