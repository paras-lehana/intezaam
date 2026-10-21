/**
 * Tests for the draft check (GenAI job 4): a model-written message may use only the facts
 * and must be in the chosen language.
 *
 * Responsibility: a clean draft survives with the language and facts-used list set by code;
 * an invented number, a link or phone number, or the wrong script swaps in the template;
 * numbers in the host's own typed name are allowed. Boundary: facts from the real engine;
 * the fallback is the offline template for the same kind.
 */
import { describe, expect, it } from 'vitest';
import { buildDraftFacts } from '../genai/draft-facts.js';
import { checkDraftFaithfulness } from '../genai/draft-check.js';
import { draftOffline } from '../offline/drafts.js';
import { planned } from './fixtures/genai-plans.js';

describe('checkDraftFaithfulness', () => {
  const { plan } = planned('jaipur-wedding');
  const facts = buildDraftFacts(plan, { kind: 'invitation', hostName: 'Meena (Flat 402)' });
  const fallback = draftOffline({ kind: 'invitation', language: 'hi', tone: 'warm' }, facts);
  const date = facts.date ?? '';

  it('keeps a faithful Hindi draft and recomputes language and facts used', () => {
    const body = `${facts.city} में ${date} को हमारी शादी में आप सपरिवार आमंत्रित हैं। — Meena (Flat 402)`;
    const result = checkDraftFaithfulness(
      { body, language: 'en', factsUsed: [] },
      facts,
      fallback,
      'hi',
    );
    expect(result.replacedBecause).toBeUndefined();
    expect(result.draft).toEqual({ body, language: 'hi', factsUsed: ['date', 'city', 'hostName'] });
  });

  it('swaps a draft with an invented number for the template', () => {
    const body = `${facts.city} में ${date} को शादी है, कृपया ₹5,000 का शगुन लाएँ।`;
    expect(
      checkDraftFaithfulness({ body, language: 'hi', factsUsed: [] }, facts, fallback, 'hi'),
    ).toEqual({
      draft: fallback,
      replacedBecause: 'unfaithful-number',
    });
  });

  it('swaps a draft with a link or phone number for the template', () => {
    for (const body of ['RSVP at https://rsvp.example', 'हमें 9876543210 पर फ़ोन करें']) {
      expect(
        checkDraftFaithfulness({ body, language: 'hi', factsUsed: [] }, facts, fallback, 'hi')
          .replacedBecause,
      ).toBe('link-or-contact');
    }
  });

  it('swaps an English draft for the template when Hindi was asked for', () => {
    const body = `You are invited to our wedding in ${facts.city}.`;
    expect(
      checkDraftFaithfulness({ body, language: 'en', factsUsed: [] }, facts, fallback, 'hi')
        .replacedBecause,
    ).toBe('wrong-script');
  });

  it('checks the subject too, with or without a host name', () => {
    const draft = {
      subject: 'Wedding on 31 Dec 2099',
      body: `You are invited, ${facts.city}.`,
      language: 'en' as const,
      factsUsed: [],
    };
    expect(checkDraftFaithfulness(draft, facts, fallback, 'en').replacedBecause).toBe(
      'unfaithful-number',
    );
    const { hostName: _host, ...anonymous } = facts;
    const clean = {
      subject: `${facts.eventKind} in ${facts.city}`,
      body: `You are invited, ${facts.city}.`,
      language: 'en' as const,
      factsUsed: [],
    };
    expect(checkDraftFaithfulness(clean, anonymous, fallback, 'en').draft.factsUsed).toEqual([
      'eventKind',
      'city',
    ]);
  });
});
