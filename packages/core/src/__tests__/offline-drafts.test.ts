/**
 * Tests for the offline twin of drafts (GenAI job 4).
 *
 * Responsibility: the register choice (Hindi → Devanagari, English + Hinglish hint →
 * Hinglish, others → English), every kind in every register and tone parses with the
 * model-output schema and passes the draft check, the facts-used list is computed from the
 * text, and long facts are capped. Boundary: facts come from the real engine.
 */
import { describe, expect, it } from 'vitest';
import { buildDraftFacts } from '../genai/draft-facts.js';
import { checkDraftFaithfulness } from '../genai/draft-check.js';
import { draftOffline, draftRegister, factsUsedIn, withoutFactValues } from '../offline/drafts.js';
import { MAX_DRAFT_BODY_CHARS, MAX_SUBJECT_CHARS } from '../schemas/limits.js';
import { DRAFT_KINDS, DRAFT_TONES, draftModelOutputSchema } from '../schemas/model-outputs.js';
import { planned } from './fixtures/genai-plans.js';

describe('draftRegister', () => {
  it('picks Devanagari for Hindi, Hinglish on request and English otherwise', () => {
    expect(draftRegister('hi')).toBe('hi');
    expect(draftRegister('hi', 'hinglish')).toBe('hi');
    expect(draftRegister('en', 'hinglish')).toBe('hinglish');
    expect(draftRegister('en')).toBe('en');
    expect(draftRegister('ta', 'hinglish')).toBe('en');
  });
});

describe('draftOffline', () => {
  const { plan } = planned('jaipur-wedding');
  const inputs = [
    { language: 'en', register: undefined },
    { language: 'hi', register: undefined },
    { language: 'en', register: 'hinglish' },
  ] as const;

  it('writes every kind in every register and tone as a valid, faithful draft', () => {
    for (const kind of DRAFT_KINDS) {
      const facts = buildDraftFacts(plan, { kind, vendorType: 'caterer', hostName: 'Meena' });
      for (const { language, register } of inputs) {
        for (const tone of DRAFT_TONES) {
          const input =
            register === undefined ? { kind, language, tone } : { kind, language, tone, register };
          const draft = draftOffline(input, facts);
          const label = `${kind}/${language}/${register ?? '-'}/${tone}`;
          expect(draftModelOutputSchema.safeParse(draft).success, label).toBe(true);
          expect(draft.language).toBe(language);
          expect(
            checkDraftFaithfulness(draft, facts, draft, language).replacedBecause,
            label,
          ).toBeUndefined();
        }
      }
    }
  });

  it('signs with the host name and lists the facts it used', () => {
    const facts = buildDraftFacts(plan, { kind: 'invitation', hostName: 'Meena' });
    const draft = draftOffline({ kind: 'invitation', language: 'en', tone: 'warm' }, facts);
    expect(draft.body.endsWith('Warm regards,\nMeena')).toBe(true);
    expect(draft.factsUsed).toEqual(
      expect.arrayContaining(['eventKind', 'date', 'city', 'hostName']),
    );
    expect(draft.subject).toBeUndefined();
  });

  it('caps the subject and body at the schema limits', () => {
    const facts = {
      ...buildDraftFacts(plan, { kind: 'vendor-enquiry', vendorType: 'caterer' }),
      city: 'x'.repeat(2_000),
    };
    const draft = draftOffline({ kind: 'vendor-enquiry', language: 'en', tone: 'formal' }, facts);
    expect(draft.body.length).toBeLessThanOrEqual(MAX_DRAFT_BODY_CHARS);
    expect((draft.subject ?? '').length).toBeLessThanOrEqual(MAX_SUBJECT_CHARS);
  });
});

describe('factsUsedIn', () => {
  it('lists the fact keys whose values appear in a text', () => {
    const facts = {
      eventKind: 'Wedding',
      city: 'Jaipur',
      guestBand: '300 guests',
      functions: ['Haldi'],
      questions: [''],
    };
    expect(factsUsedIn('A wedding in Jaipur with Haldi', facts)).toEqual([
      'eventKind',
      'city',
      'functions',
    ]);
    expect(factsUsedIn('Nothing here', facts)).toEqual([]);
  });

  it('removes fact values, longest first, so copied English facts do not count against the script', () => {
    const facts = {
      eventKind: 'Wedding',
      city: 'Jaipur',
      guestBand: '300 guests',
      functions: [],
      questions: ['Is the Jaipur hall free?'],
    };
    expect(withoutFactValues('जयपुर: Is the Jaipur hall free? Wedding', facts)).toBe('जयपुर:    ');
  });
});
