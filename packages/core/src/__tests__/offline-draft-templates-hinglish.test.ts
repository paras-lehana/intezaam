/**
 * Tests for the Hinglish message templates (Hindi typed in the Latin script).
 *
 * Responsibility: every kind is written in romanised Hindi from the facts only, the RSVP
 * reminder follows the owner's guest-manager template with the date in brackets, an open
 * date is said in words, and no line has double spaces. Boundary: facts are test-owned.
 */
import { describe, expect, it } from 'vitest';
import type { DraftFacts } from '../genai/draft-facts.js';
import { HINGLISH_TEMPLATES } from '../offline/draft-templates-hinglish.js';
import { DRAFT_KINDS } from '../schemas/model-outputs.js';

const FACTS: DraftFacts = {
  eventKind: 'Wedding',
  date: '25 Nov 2026',
  city: 'Jaipur',
  guestBand: '300 guests',
  functions: ['Haldi'],
  questions: ['GST included hai?'],
  budgetBand: '₹25 L',
};

const { date: _date, ...UNDATED } = FACTS;

describe('HINGLISH_TEMPLATES', () => {
  it('writes every kind, dated or not, without double spaces', () => {
    for (const kind of DRAFT_KINDS) {
      for (const facts of [FACTS, UNDATED]) {
        const text = HINGLISH_TEMPLATES[kind](facts, 'warm');
        expect(text.body, kind).not.toMatch(/ {2}/);
        expect(text.body).toContain('Jaipur');
      }
    }
  });

  it('follows the guest-manager RSVP reminder with the date in brackets', () => {
    const body = HINGLISH_TEMPLATES['rsvp-reminder'](FACTS, 'warm').body;
    expect(
      body.startsWith(
        'Namaste ji 🙏\n\nAap Jaipur mein hamare Wedding (25 Nov 2026) mein padhaar rahe hain?',
      ),
    ).toBe(true);
    expect(body.endsWith('✅ Haan / ❌ Nahi / 🤔 Baad mein bata denge\n\nDhanyavaad 🙏')).toBe(
      true,
    );
    expect(HINGLISH_TEMPLATES['rsvp-reminder'](UNDATED, 'warm').body).toContain(
      'hamare Wedding mein padhaar',
    );
  });

  it('says an open date in words and lists vendor questions', () => {
    const enquiry = HINGLISH_TEMPLATES['vendor-enquiry'](UNDATED, 'formal');
    expect(enquiry.body).toContain('(date abhi fix nahi hai)');
    expect(enquiry.body).toContain('- GST included hai?');
    expect(enquiry.subject).toBe('Enquiry: Jaipur mein Wedding');
    expect(HINGLISH_TEMPLATES['plan-summary'](UNDATED, 'warm').body).toContain(
      'date abhi fix nahi',
    );
    expect(HINGLISH_TEMPLATES['plan-summary'](FACTS, 'warm').body).toContain('Functions: Haldi');
  });

  it('leaves out the budget, functions and questions lines when those facts are absent', () => {
    const { budgetBand: _budget, questions: _questions, ...bare } = FACTS;
    const minimal = { ...bare, functions: [] };
    expect(HINGLISH_TEMPLATES['plan-summary'](minimal, 'warm').body).not.toMatch(
      /Budget:|Functions:/,
    );
    expect(HINGLISH_TEMPLATES['vendor-enquiry'](minimal, 'warm').body).not.toContain(
      'Kripya batayein:',
    );
  });
});
