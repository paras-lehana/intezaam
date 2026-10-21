/**
 * Tests for the question-aware Ask answers: a question that names a vendor, a function, a
 * guest count, late music or rain gets that item's own answer, not a generic list.
 *
 * Responsibility: the specific questions a reviewer asked of the Jaipur sample (DJ until
 * 11:30, photographer cost and booking, venue space for 300, pandit questions, a tent in
 * the rain, cutting the reception) each get a different answer built from the matching
 * plan item, and a configured model is not skipped for any of them. Boundary: plans come
 * from the real engine; every expected value is read from the plan.
 */
import { describe, expect, it } from 'vitest';
import { USABLE_FLOOR_SHARE } from '../domain/space.js';
import { formatInr } from '../format.js';
import { askByRules } from '../offline/ask.js';
import { answerByIntent } from '../offline/ask-intents.js';
import { formatShortDate } from '../offline/describe-brief.js';
import type { Plan } from '../schemas/plan.js';
import { planned, TODAY } from './fixtures/genai-plans.js';

const { plan, context } = planned('jaipur-wedding');

function vendorOf(target: Plan, type: string): Plan['vendors'][number] {
  const vendor = target.vendors.find((item) => item.vendorType === type);
  if (vendor === undefined) throw new Error(`the sample plan has no ${type}`);
  return vendor;
}

function ask(question: string, target: Plan = plan): string {
  return answerByIntent(question, target)?.answer ?? '';
}

const SPECIFIC = {
  dj: 'Can the DJ play until 11:30 at the sangeet?',
  photoCost: 'How much should the photographer cost?',
  space: 'Is the venue big enough for 300 people?',
  pandit: 'Which pandit questions should I ask?',
  rain: 'Do we need a tent if it rains?',
  photoWhen: 'When should I book the photographer?',
  reception: 'Should we cut the reception to save money?',
} as const;

describe('specific Ask questions', () => {
  it('answers late DJ music from the night-sound blocker, not the vendor list', () => {
    const blocker = plan.risks.find((risk) => risk.ruleId === 'PERM-02');
    expect(blocker?.severity).toBe('blocker');
    expect(answerByIntent(SPECIFIC.dj, plan)?.intent).toBe('sound');
    expect(ask(SPECIFIC.dj)).toContain(blocker?.title ?? 'missing blocker');
    expect(ask(SPECIFIC.dj)).toContain(blocker?.fix ?? 'missing fix');
  });

  it("answers the photographer's cost and booking date from its own card", () => {
    const photographer = vendorOf(plan, 'photographer');
    const cost = ask(SPECIFIC.photoCost);
    expect(cost).toContain(formatInr(photographer.budgetInr ?? 0));
    for (const payment of photographer.payments)
      expect(cost).toContain(formatInr(payment.amountInr));
    expect(ask(SPECIFIC.photoWhen)).toContain(formatShortDate(photographer.bookByIso ?? TODAY));
  });

  it('answers venue space for the asked guest count from the space check', () => {
    const needed = Math.ceil((300 * plan.space.sqftPerGuest) / USABLE_FLOOR_SHARE);
    expect(plan.space.capacity).toBeUndefined();
    expect(answerByIntent(SPECIFIC.space, plan)?.sources).toEqual(['space']);
    expect(ask(SPECIFIC.space)).toContain(needed.toLocaleString('en-IN'));
    const small: Plan = { ...plan, space: { ...plan.space, capacity: 250 } };
    const large: Plan = { ...plan, space: { ...plan.space, capacity: 400 } };
    expect(ask(SPECIFIC.space, small).startsWith('No:')).toBe(true);
    expect(ask(SPECIFIC.space, large).startsWith('Yes:')).toBe(true);
  });

  it("lists the pandit's own questions", () => {
    const [first] = vendorOf(plan, 'pandit').questions;
    expect(ask(SPECIFIC.pandit)).toContain(first ?? 'missing question');
  });

  it('answers rain from the rain risk and the tent card', () => {
    const tent = vendorOf(plan, 'tent_house');
    expect(answerByIntent(SPECIFIC.rain, plan)?.intent).toBe('weather');
    expect(ask(SPECIFIC.rain)).toContain(tent.questions[0] ?? 'missing question');
    const ganesh = planned('society-ganesh').plan;
    const rain = ganesh.risks.find((risk) => risk.ruleId === 'CTX-07');
    expect(ask(SPECIFIC.rain, ganesh)).toContain(rain?.fix ?? 'missing rain risk');
  });

  it('answers cutting a function with the lever that drops it', () => {
    const lever = plan.levers.find((item) =>
      (item.patch?.ops ?? []).some((op) => op.op === 'removeFunction' && op.value === 'reception'),
    );
    expect(lever?.ruleId).toBe('LEV-04');
    expect(ask(SPECIFIC.reception)).toContain(lever?.detail ?? 'missing lever');
    const sangeet = plan.functions.find((fn) => fn.functionKind === 'sangeet');
    expect(ask('What does the sangeet cost?')).toContain(formatInr(sangeet?.budgetInr ?? 0));
  });

  it('gives each question its own answer and leaves all of them to a configured model', () => {
    const answers = Object.values(SPECIFIC).map((question) => ask(question));
    expect(new Set(answers).size).toBe(answers.length);
    for (const answer of answers) expect(answer.startsWith('Book first:')).toBe(false);
    for (const question of Object.values(SPECIFIC))
      expect(askByRules(question, plan, context, TODAY), question).toBeUndefined();
  });

  it('says when a named vendor is not in the plan and when no sound runs outdoors', () => {
    expect(ask('When should I book the qazi?')).toContain('Qazi or imam is not part of this plan.');
    const chennai = planned('chennai-60th').plan;
    expect(ask('Can the music go on till late?', chennai)).toContain('no amplified sound outdoors');
  });
});
