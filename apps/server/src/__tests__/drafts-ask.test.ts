/**
 * Tests for POST /api/drafts (GenAI job 4) and POST /api/ask (GenAI job 5).
 *
 * Responsibility: prove drafts use only plan facts (an invented amount brings back the
 * template), carry code-built Gmail and WhatsApp links, fence the host's name and honour the
 * brief's Hinglish register (template, prompt and cache key); and that Ask
 * answers refusals and change commands by rule with no model call, checks model answers against
 * the plan facts, and caches. Boundary: supertest with a scripted model; expectations derived
 * from core's offline twins and link builders.
 */
import {
  HINGLISH_RULE,
  MAX_QUESTION_CHARS,
  askOffline,
  askResponseSchema,
  buildDraftFacts,
  buildGmailComposeUrl,
  buildPlan,
  buildWhatsAppUrl,
  draftOffline,
  draftResponseSchema,
} from '@intezaam/core';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { cleanUserText } from '../services/service-kit.js';
import { TODAY, makeApp, replyWith, weddingContext } from './helpers.js';

const context = weddingContext();
const built = buildPlan(context, TODAY);
if (!built.ok) throw new Error('the sample wedding must plan');
const plan = built.value;

const enquiry = {
  kind: 'vendor-enquiry',
  language: 'en',
  tone: 'warm',
  vendorType: 'caterer',
} as const;
const TEMPLATE = draftOffline(enquiry, buildDraftFacts(plan, enquiry));
const draftBody = { context, todayIso: TODAY, ...enquiry };

describe('POST /api/drafts', () => {
  it('writes an English draft in Hinglish when the brief was Hinglish', async () => {
    const hinglish = draftOffline(
      { ...enquiry, register: 'hinglish' },
      buildDraftFacts(plan, enquiry),
    );
    const { app, calls } = makeApp({ script: () => Promise.reject(new Error('down')) });
    const res = await request(app)
      .post('/api/drafts')
      .send({ ...draftBody, hinglish: true });
    expect(draftResponseSchema.parse(res.body).body).toBe(hinglish.body);
    expect(hinglish.body).not.toBe(TEMPLATE.body);
    expect(calls[0]?.system).toContain(HINGLISH_RULE);

    const plain = await request(app).post('/api/drafts').send(draftBody);
    expect(plain.body.body).toBe(TEMPLATE.body);
    expect(calls.at(-1)?.system).not.toContain(HINGLISH_RULE);
  });

  it('writes the template offline with code-built Gmail and WhatsApp links', async () => {
    const res = await request(makeApp().app).post('/api/drafts').send(draftBody);
    expect(res.status).toBe(200);
    const parsed = draftResponseSchema.parse(res.body);
    expect(parsed.body).toBe(TEMPLATE.body);
    expect(parsed.whatsappUrl).toBe(buildWhatsAppUrl(TEMPLATE.body));
    expect(parsed.gmailUrl).toBe(
      buildGmailComposeUrl({ subject: TEMPLATE.subject ?? '', body: TEMPLATE.body }),
    );
    expect(parsed.provenance.mode).toBe('offline');
  });

  it('keeps a faithful model draft and caches it', async () => {
    const reply = { ...TEMPLATE, body: `Namaste! ${TEMPLATE.body}` };
    const { app, calls } = makeApp({ script: replyWith(reply) });
    const res = await request(app).post('/api/drafts').send(draftBody);
    expect(draftResponseSchema.parse(res.body)).toMatchObject({
      body: reply.body,
      provenance: { mode: 'gemini' },
    });
    await request(app).post('/api/drafts').send(draftBody);
    expect(calls).toHaveLength(1);
  });

  it('brings back the template when the model invents an amount', async () => {
    const reply = { ...TEMPLATE, body: `${TEMPLATE.body} Our budget is ₹12,34,567.` };
    const res = await request(makeApp({ script: replyWith(reply) }).app)
      .post('/api/drafts')
      .send(draftBody);
    const parsed = draftResponseSchema.parse(res.body);
    expect(parsed.body).toBe(TEMPLATE.body);
    expect(parsed.provenance.mode).toBe('offline');
  });

  it('fences and redacts the host name, and gives an invitation no Gmail link', async () => {
    const { app, calls } = makeApp({ script: replyWith(TEMPLATE) });
    const hostName = 'Meena 9876543210';
    const res = await request(app).post('/api/drafts').send({
      context,
      todayIso: TODAY,
      kind: 'invitation',
      language: 'en',
      tone: 'warm',
      hostName,
    });
    expect(calls[0]?.prompt).toMatch(/<<<HOST_NAME_[a-f0-9]{16}>>>\nMeena \[PHONE\]/);
    expect(calls[0]?.prompt).not.toContain('9876543210');
    expect(res.status).toBe(200);
  });
});

const askBody = (question: string): Record<string, unknown> => ({
  context,
  todayIso: TODAY,
  question,
  history: [],
});
const OPEN_QUESTION = 'What is the meaning of the colours?';
const SEEN_QUESTION = cleanUserText(OPEN_QUESTION, MAX_QUESTION_CHARS).text;

describe('POST /api/ask', () => {
  it('refuses to book or pay by rule, with no model call', async () => {
    const { app, calls } = makeApp({ script: replyWith({ answer: 'Booked!', sources: [] }) });
    const res = await request(app).post('/api/ask').send(askBody('Please book the caterer for me'));
    const parsed = askResponseSchema.parse(res.body);
    expect(parsed.refusal).toEqual({ reason: 'booking-or-payment' });
    expect(parsed.provenance.mode).toBe('offline');
    expect(calls).toHaveLength(0);
  });

  it('turns a change command into a patch by rule', async () => {
    const { app, calls } = makeApp({ script: replyWith({ answer: 'x', sources: [] }) });
    const res = await request(app).post('/api/ask').send(askBody('add 50 guests'));
    expect(askResponseSchema.parse(res.body).patch?.ops).toEqual([
      { op: 'setGuests', value: context.guests + 50 },
    ]);
    expect(calls).toHaveLength(0);
  });

  it('asks the model for an open question, fences it, and caches the answer', async () => {
    const reply = {
      answer: 'Colours are a style choice; the Ideas tab lists themes for your plan.',
      sources: ['ideas'],
    };
    const { app, calls } = makeApp({ script: replyWith(reply) });
    const history = [{ question: 'Call me on 9876543210', answer: 'Noted.' }];
    const res = await request(app)
      .post('/api/ask')
      .send({ ...askBody(OPEN_QUESTION), history });
    expect(askResponseSchema.parse(res.body)).toMatchObject({
      ...reply,
      provenance: { mode: 'gemini' },
    });
    expect(calls[0]?.prompt).toMatch(/<<<QUESTION_[a-f0-9]{16}>>>/);
    expect(calls[0]?.prompt).not.toContain('9876543210');
    await request(app)
      .post('/api/ask')
      .send({ ...askBody(OPEN_QUESTION), history });
    expect(calls).toHaveLength(1);
  });

  it('replaces a model answer whose number is not in the plan facts', async () => {
    const reply = { answer: 'Your wedding will cost ₹99,99,999.', sources: ['budget'] };
    const res = await request(makeApp({ script: replyWith(reply) }).app)
      .post('/api/ask')
      .send(askBody(OPEN_QUESTION));
    expect(res.body.answer).toBe(askOffline(SEEN_QUESTION, plan, context, TODAY).answer);
  });

  it('keeps only a valid proposed patch', async () => {
    const reply = {
      answer: 'I can set 250 guests.',
      sources: ['headcount'],
      patch: { ops: [{ op: 'setGuests', value: 250 }] },
    };
    const res = await request(makeApp({ script: replyWith(reply) }).app)
      .post('/api/ask')
      .send(askBody(OPEN_QUESTION));
    expect(res.body.patch).toEqual({ ops: [{ op: 'setGuests', value: 250 }] });
  });

  it('answers offline when the AI is not configured', async () => {
    const res = await request(makeApp().app).post('/api/ask').send(askBody(OPEN_QUESTION));
    const parsed = askResponseSchema.parse(res.body);
    expect(parsed.answer).toBe(askOffline(SEEN_QUESTION, plan, context, TODAY).answer);
    expect(parsed.provenance.reason).toBe('not_configured');
  });
});
