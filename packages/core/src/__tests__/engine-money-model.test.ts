/**
 * Tests for engine/money-model.ts — the one per-kind table of money models and food bases.
 *
 * Responsibility: prove every community kind is judged by its committee, every party-banded
 * kind has published party bands, the 60th borrows the wedding rows at grade D and says so,
 * weddings use the rows at grade C, and each model names the caterer class it prices at.
 * Boundary: table checks against the domain kinds and bands.
 */
import { describe, expect, it } from 'vitest';
import { EVENT_KIND_PROFILES } from '../domain/event-kinds.js';
import { EVENT_KINDS } from '../domain/events.js';
import { partyBandFor } from '../engine/estimate.js';
import {
  DEFAULT_LEVEL_BY_MODEL,
  KIND_MONEY,
  MONEY_MODELS,
  moneyModelOf,
  rowsSubject,
} from '../engine/money-model.js';
import { birthday, classified } from './fixtures/engine-contexts.js';

describe('KIND_MONEY', () => {
  it('judges every community kind by its committee, with prasad food', () => {
    for (const kind of EVENT_KINDS) {
      const community = EVENT_KIND_PROFILES[kind].family === 'community';
      expect(KIND_MONEY[kind].model === 'committee').toBe(community);
      expect(KIND_MONEY[kind].food === 'prasad').toBe(community);
    }
  });

  it('gives every party-banded kind a published party band', () => {
    for (const kind of EVENT_KINDS) {
      if (KIND_MONEY[kind].model !== 'party-bands') continue;
      expect(partyBandFor(classified(birthday({ kind })))).not.toBeNull();
    }
  });

  it('uses every money model somewhere', () => {
    const used = new Set(EVENT_KINDS.map((kind) => KIND_MONEY[kind].model));
    expect([...used].sort()).toEqual([...MONEY_MODELS].sort());
  });
});

describe('moneyModelOf, rowsSubject and caterer classes', () => {
  it('reads the model for a context', () => {
    expect(moneyModelOf({ kind: 'sixtieth-birthday' })).toBe('wedding-rows');
    expect(moneyModelOf({ kind: 'kids-birthday' })).toBe('party-bands');
  });

  it('labels the 60th’s borrowed rows as a grade-D assumption, and weddings as grade C', () => {
    const sixtieth = rowsSubject('sixtieth-birthday');
    expect([sixtieth.confidence, sixtieth.basisNote?.includes('assumption')]).toEqual(['D', true]);
    const wedding = rowsSubject('wedding');
    expect([wedding.confidence, wedding.basisNote]).toEqual(['C', null]);
  });

  it('prices committee and party food at community rates and the rest at a standard caterer', () => {
    expect(DEFAULT_LEVEL_BY_MODEL).toEqual({
      'wedding-rows': 'standard',
      'party-bands': 'community',
      'bottom-up': 'standard',
      committee: 'community',
    });
  });
});
