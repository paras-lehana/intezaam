/**
 * Tests for the draft facts (GenAI job 4): the only facts a message may use.
 *
 * Responsibility: kind, date, city, guests and functions come from the plan; the budget
 * appears only in the family's own plan summary; vendor questions only in a vendor enquiry;
 * an undated plan has no date; the host's name stays out of the fact lines. Boundary: plans
 * come from the real engine.
 */
import { describe, expect, it } from 'vitest';
import { EVENT_KIND_PROFILES } from '../domain/event-kinds.js';
import { VENDOR_PROFILES } from '../domain/vendors.js';
import { buildDraftFacts, draftFactLines } from '../genai/draft-facts.js';
import { formatLakh } from '../format.js';
import { formatShortDate } from '../offline/describe-brief.js';
import { planned, plannedContext, undatedContext } from './fixtures/genai-plans.js';

describe('buildDraftFacts', () => {
  const { plan } = planned('jaipur-wedding');

  it('takes the event, date, city, guests and functions from the plan', () => {
    const facts = buildDraftFacts(plan, { kind: 'invitation' });
    expect(facts).toEqual({
      eventKind: EVENT_KIND_PROFILES[plan.contextEcho.kind].label,
      date: formatShortDate(plan.contextEcho.dateIso ?? ''),
      city: plan.contextEcho.cityName,
      guestBand: `${plan.headcount.invited} guests`,
      functions: plan.functions.map((card) => card.label),
    });
  });

  it('gives the budget only to the plan summary', () => {
    expect(buildDraftFacts(plan, { kind: 'plan-summary' }).budgetBand).toBe(
      formatLakh(plan.budget.totalInr),
    );
    expect(
      buildDraftFacts(plan, { kind: 'vendor-enquiry', vendorType: 'caterer' }).budgetBand,
    ).toBeUndefined();
  });

  it('gives a vendor enquiry the vendor and its first three playbook questions', () => {
    const facts = buildDraftFacts(plan, { kind: 'vendor-enquiry', vendorType: 'caterer' });
    const checklist = plan.vendors.find((vendor) => vendor.vendorType === 'caterer');
    expect(facts.vendorCategory).toBe(VENDOR_PROFILES.caterer.label);
    expect(facts.questions).toEqual(checklist?.questions.slice(0, 3));
    expect(
      buildDraftFacts(plan, { kind: 'thank-you', vendorType: 'caterer' }).questions,
    ).toBeUndefined();
  });

  it('leaves the date out of an undated plan and keeps the host name for fencing', () => {
    const undated = plannedContext(undatedContext('chennai-60th')).plan;
    const facts = buildDraftFacts(undated, { kind: 'invitation', hostName: 'Lakshmi' });
    expect(facts.date).toBeUndefined();
    expect(facts.hostName).toBe('Lakshmi');
    const lines = draftFactLines(facts);
    expect(lines).toContain('date: not fixed yet');
    expect(lines).not.toContain('Lakshmi');
  });
});

describe('draftFactLines', () => {
  it('writes one key per line with optional facts only when present', () => {
    const lines = draftFactLines({
      eventKind: 'Wedding',
      city: 'Jaipur',
      guestBand: '300 guests',
      functions: [],
      vendorCategory: 'Caterer',
      questions: ['Is GST included?', 'Tasting?'],
      budgetBand: '₹25 L',
    });
    expect(lines.split('\n')).toEqual([
      'eventKind: Wedding',
      'date: not fixed yet',
      'city: Jaipur',
      'guestBand: 300 guests',
      'budgetBand: ₹25 L',
      'functions: none',
      'vendorCategory: Caterer',
      'questions: Is GST included? | Tasting?',
    ]);
  });
});
