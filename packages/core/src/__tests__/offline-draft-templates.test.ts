/**
 * Tests for the English and Hindi message templates and their helpers.
 *
 * Responsibility: the frame (greeting, lines, sign-off, host), the date, bullet and
 * function helpers, single spacing around dates in Hindi, the budget only in the plan
 * summary, vendor questions as bullets and an open date said in words. Boundary: facts are
 * test-owned display strings, as buildDraftFacts would produce.
 */
import { describe, expect, it } from 'vitest';
import type { DraftFacts } from '../genai/draft-facts.js';
import {
  bracketDate,
  bullets,
  DRAFT_REGISTERS,
  EN_TEMPLATES,
  frame,
  functionList,
  HI_TEMPLATES,
  when,
} from '../offline/draft-templates.js';
import { DRAFT_KINDS } from '../schemas/model-outputs.js';

const FACTS: DraftFacts = {
  eventKind: 'Wedding',
  date: '25 Nov 2026',
  city: 'Jaipur',
  guestBand: '300 guests',
  functions: ['Haldi', 'Wedding'],
  vendorCategory: 'Caterer',
  questions: ['Is GST included?', 'Is tasting free?'],
  budgetBand: '₹25 L',
  hostName: 'Meena',
};

const { date: _date, ...UNDATED } = FACTS;
const { hostName: _host, ...NO_HOST } = UNDATED;
const { vendorCategory: _vendor, questions: _questions, ...GENERAL } = FACTS;

describe('template helpers', () => {
  it('frames lines with greeting, sign-off and host for every register', () => {
    expect(DRAFT_REGISTERS).toEqual(['en', 'hi', 'hinglish']);
    expect(frame('en', 'warm', FACTS, ['See you there.'])).toBe(
      'Namaste,\n\nSee you there.\n\nWarm regards,\nMeena',
    );
    expect(frame('hi', 'formal', UNDATED, ['x']).startsWith('आदरणीय')).toBe(true);
    expect(frame('hinglish', 'warm', NO_HOST, ['x']).endsWith('Dhanyavaad 🙏')).toBe(true);
  });

  it('renders dates, bullets and function lists', () => {
    expect(when(FACTS, ' on', '')).toBe(' on 25 Nov 2026');
    expect(when(UNDATED, ' on', ' (open)')).toBe(' (open)');
    expect(bracketDate(FACTS)).toBe(' (25 Nov 2026)');
    expect(bracketDate(UNDATED)).toBe('');
    expect(bullets(['a', 'b'])).toEqual(['- a', '- b']);
    expect(bullets(undefined)).toEqual([]);
    expect(functionList(FACTS)).toBe(' (Haldi, Wedding)');
    expect(functionList({ ...FACTS, functions: [] })).toBe('');
  });
});

describe('EN_TEMPLATES / HI_TEMPLATES', () => {
  it('writes every kind in both registers without double spaces', () => {
    for (const kind of DRAFT_KINDS) {
      for (const facts of [FACTS, UNDATED]) {
        for (const text of [
          EN_TEMPLATES[kind](facts, 'warm'),
          HI_TEMPLATES[kind](facts, 'formal'),
        ]) {
          expect(text.body, kind).not.toMatch(/ {2}/);
          expect(text.body.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('puts the date before "को" in Hindi and says an open date in words', () => {
    expect(HI_TEMPLATES.invitation(FACTS, 'warm').body).toContain(
      'Jaipur में 25 Nov 2026 को हमारे Wedding',
    );
    expect(HI_TEMPLATES['vendor-enquiry'](UNDATED, 'warm').body).toContain('(तारीख़ तय होनी है)');
    expect(EN_TEMPLATES['vendor-enquiry'](UNDATED, 'warm').body).toContain('(date to be fixed)');
  });

  it('asks vendor questions as bullets with a subject, and shows the budget only in the summary', () => {
    const enquiry = EN_TEMPLATES['vendor-enquiry'](FACTS, 'formal');
    expect(enquiry.subject).toBe('Enquiry: Caterer for a wedding in Jaipur');
    expect(enquiry.body).toContain('- Is GST included?');
    expect(enquiry.body).not.toContain('₹25 L');
    expect(EN_TEMPLATES['plan-summary'](FACTS, 'warm').body).toContain('Budget: ₹25 L');
    expect(HI_TEMPLATES['plan-summary'](FACTS, 'warm').body).toContain('कार्यक्रम: Haldi, Wedding');
    expect(EN_TEMPLATES['vendor-enquiry'](GENERAL, 'warm').subject).toBe(
      'Enquiry: services for a wedding in Jaipur',
    );
  });

  it('leaves out the budget, functions and questions lines when those facts are absent', () => {
    const { budgetBand: _budget, ...bare } = GENERAL;
    const minimal = { ...bare, functions: [] };
    expect(EN_TEMPLATES['plan-summary'](minimal, 'warm').body).not.toMatch(/Budget:|Functions:/);
    expect(HI_TEMPLATES['plan-summary'](minimal, 'warm').body).not.toMatch(/बजट:|कार्यक्रम:/);
    expect(HI_TEMPLATES['vendor-enquiry'](minimal, 'warm').body).not.toContain('कृपया बताएँ:');
    expect(HI_TEMPLATES['vendor-enquiry'](FACTS, 'warm').body).toContain('- Is GST included?');
  });
});
