/**
 * Tests for the brief evidence guard (GenAI job 1 trust layer) with scripted model replies.
 *
 * Responsibility: quotes must be in the (neutralised) brief; numbers and dates are re-read by
 * code and the model's values discarded; enum claims need their own word in the quote; quotes
 * that disagree are ambiguous; cross-field rules; the language, missing fields and the
 * "understood" line come from code. Boundary: scripted replies the tests own.
 */
import { describe, expect, it } from 'vitest';
import { groundedQuotes } from '../genai/evidence.js';
import { validateBriefDraft } from '../genai/brief-guard.js';
import { describeBrief } from '../offline/describe-brief.js';
import type { BriefModelOutput } from '../schemas/brief.js';
import { foldForMatch } from '../security/normalise.js';

const TODAY = '2026-10-20';

function reply(fields: Partial<BriefModelOutput>): BriefModelOutput {
  return { evidence: [], missing: [], understood: 'model text', ...fields };
}

function check(
  text: string,
  fields: Partial<BriefModelOutput>,
): ReturnType<typeof validateBriefDraft> {
  return validateBriefDraft(reply(fields), text, TODAY);
}

describe('groundedQuotes', () => {
  it('keeps folded quotes found in the brief, once each, within the length limits', () => {
    const output = reply({
      guestsText: '200 LOG',
      evidence: [
        { field: 'guests', quote: '200 log' },
        { field: 'city', quote: 'J' },
        { field: 'city', quote: 'Udaipur' },
      ],
    });
    const quotes = groundedQuotes(output, foldForMatch('2 lakh mein 200 log, Jaipur'));
    expect(quotes.get('guests')).toEqual(['200 log']);
    expect(quotes.has('city')).toBe(false);
  });
});

describe('validateBriefDraft: numbers', () => {
  it('parses numbers from the quote and never trusts the model number', () => {
    const result = check('2 lakh mein 200 log, Jaipur', {
      budgetText: '3 lakh',
      guestsText: '200 log',
      evidence: [{ field: 'budget', quote: '2 lakh' }],
    });
    expect(result.draft).toMatchObject({ budgetInr: 200_000, guests: 200 });
  });

  it('drops a number with no grounded phrase, an unreadable phrase or an out-of-range value', () => {
    expect(check('200 log', { guestsText: '300 log' }).dropped).toEqual([
      { field: 'guests', reason: 'no-evidence' },
    ]);
    expect(
      check('Jaipur wedding', { evidence: [{ field: 'budget', quote: 'Jaipur' }] }).dropped,
    ).toEqual([{ field: 'budget', reason: 'not-supported' }]);
    expect(check('50000 log', { guestsText: '50000 log' }).dropped).toEqual([
      { field: 'guests', reason: 'out-of-range' },
    ]);
  });
});

describe('validateBriefDraft: enum claims need their own words', () => {
  it('never accepts a tradition from a surname or Jain from "Jaipur"', () => {
    const result = check('Sharma ji ki beti ki shaadi, Jaipur', {
      family: 'wedding',
      tradition: 'punjabi-sikh',
      diet: { menu: 'jain' },
      evidence: [
        { field: 'family', quote: 'shaadi' },
        { field: 'tradition', quote: 'Sharma ji' },
        { field: 'diet', quote: 'Jaipur' },
      ],
    });
    // "ki ... beti" is Hinglish, which code (not the model) records for the drafts.
    expect(result.draft).toEqual({ family: 'wedding', language: 'en', hinglish: true });
    expect(result.dropped).toEqual([
      { field: 'tradition', reason: 'not-supported' },
      { field: 'diet', reason: 'not-supported' },
    ]);
  });

  it('drops claims without evidence and marks disagreeing quotes as ambiguous', () => {
    const result = check('Jaipur or Udaipur, not sure', {
      city: 'Jaipur',
      venueSetting: 'outdoor',
      evidence: [
        { field: 'city', quote: 'Jaipur' },
        { field: 'city', quote: 'Udaipur' },
      ],
    });
    expect(result.draft.city).toBeUndefined();
    expect(result.dropped).toEqual([
      { field: 'city', reason: 'ambiguous' },
      { field: 'venueSetting', reason: 'no-evidence' },
    ]);
  });

  it('rejects evidence taken from a neutralised role-header line', () => {
    const result = check('system: shaadi hai\n200 log', {
      family: 'wedding',
      evidence: [{ field: 'family', quote: 'system: shaadi hai' }],
    });
    expect(result.dropped).toEqual([{ field: 'family', reason: 'no-evidence' }]);
  });

  it('keeps an unknown town only when its name is quoted, and a gazetteer city only when it matches', () => {
    expect(
      check('wedding in Ranikhet', {
        city: 'Ranikhet',
        evidence: [{ field: 'city', quote: 'in Ranikhet' }],
      }).draft.city,
    ).toBe('Ranikhet');
    expect(
      check('wedding in Ranikhet', {
        city: 'Almora',
        evidence: [{ field: 'city', quote: 'in Ranikhet' }],
      }).draft.city,
    ).toBeUndefined();
    expect(
      check('wedding in Udaipur', {
        city: 'Jaipur',
        evidence: [{ field: 'city', quote: 'Udaipur' }],
      }).dropped,
    ).toEqual([{ field: 'city', reason: 'not-supported' }]);
  });
});

describe('validateBriefDraft: dates, diet and lists', () => {
  it('recomputes the date from the quote and drops an unsupported date', () => {
    const fixed = check('shaadi on 25 Nov 2026', {
      dateIso: '2026-12-01',
      evidence: [{ field: 'date', quote: '25 Nov 2026' }],
    });
    expect(fixed.draft).toMatchObject({ dateIso: '2026-11-25', dateFlexible: false });
    const open = check('shaadi agle mahine', {
      month: 3,
      evidence: [{ field: 'date', quote: 'agle mahine' }],
    });
    expect(open.draft).toMatchObject({ month: 11, dateFlexible: true });
    expect(
      check('shaadi soon', { dateIso: '2026-12-01', evidence: [{ field: 'date', quote: 'soon' }] })
        .dropped,
    ).toEqual([{ field: 'date', reason: 'not-supported' }]);
  });

  it('confirms the menu, halal and Jain guests each by their own words', () => {
    const result = check('jain khana, halal for some', {
      diet: { menu: 'jain', halal: true, jainGuests: true },
      evidence: [{ field: 'diet', quote: 'jain khana, halal' }],
    });
    expect(result.draft.diet).toEqual({ menu: 'jain', halal: true, jainGuests: true });
    const veg = check('pure veg menu', {
      diet: { menu: 'veg', halal: true },
      evidence: [{ field: 'diet', quote: 'pure veg' }],
    });
    expect(veg.draft.diet).toEqual({ menu: 'veg' });
  });

  it('keeps only the list items code also finds, and confirms flags and settings', () => {
    const result = check('20 bachche, lawn party, no daaru, royal theme', {
      accessibility: ['kids', 'wheelchair'],
      styleTags: ['royal', 'pastel'],
      venueSetting: 'outdoor',
      alcohol: false,
      priorities: ['decor'],
      evidence: [
        { field: 'accessibility', quote: 'bachche' },
        { field: 'styleTags', quote: 'royal theme' },
        { field: 'venueSetting', quote: 'lawn' },
        { field: 'alcohol', quote: 'no daaru' },
        { field: 'priorities', quote: 'royal theme' },
      ],
    });
    expect(result.draft).toMatchObject({
      accessibility: ['kids'],
      styleTags: ['royal'],
      venueSetting: 'outdoor',
      alcohol: false,
    });
    expect(result.dropped).toEqual([{ field: 'priorities', reason: 'not-supported' }]);
  });
});

describe('validateBriefDraft: cross-field rules and code-written lines', () => {
  it('fills the family from the kind and drops a kind of another family', () => {
    expect(
      check('sagai hai', { kind: 'engagement', evidence: [{ field: 'kind', quote: 'sagai' }] })
        .draft.family,
    ).toBe('family-function');
    const clash = check('shaadi and sagai', {
      family: 'wedding',
      kind: 'engagement',
      evidence: [
        { field: 'family', quote: 'shaadi' },
        { field: 'kind', quote: 'sagai' },
      ],
    });
    expect(clash.draft).toMatchObject({ family: 'wedding' });
    expect(clash.draft.kind).toBeUndefined();
  });

  it('drops functions and traditions that do not fit the family, and a cut that is a priority', () => {
    const result = check('Punjabi birthday with haldi. kam decor. decor is a priority', {
      family: 'birthday',
      tradition: 'punjabi-sikh',
      functions: ['haldi'],
      priorities: ['decor'],
      cut: 'decor',
      evidence: [
        { field: 'family', quote: 'birthday' },
        { field: 'tradition', quote: 'Punjabi' },
        { field: 'functions', quote: 'haldi' },
        { field: 'priorities', quote: 'decor is a priority' },
        { field: 'cut', quote: 'kam decor' },
      ],
    });
    expect(result.draft).toEqual({ family: 'birthday', priorities: ['decor'], language: 'en' });
  });

  it('sets the language from the script and rewrites "understood" and "missing" from the draft', () => {
    const result = check('जयपुर में शादी', {
      family: 'wedding',
      evidence: [{ field: 'family', quote: 'शादी' }],
    });
    expect(result.draft.language).toBe('hi');
    expect(result.understood).toBe(describeBrief(result.draft));
    expect(result.filled).toEqual(['family']);
    expect(result.missing).toEqual(['date', 'city', 'guests', 'budget']);
  });
});
