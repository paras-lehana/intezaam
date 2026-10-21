/**
 * Tests for POST /api/brief (GenAI job 1): offline and Gemini modes, redaction before the
 * model, the evidence guard, the cache and the fallback reasons.
 *
 * Responsibility: prove the route returns exactly what core's guard makes of the reply.
 * Boundary: supertest with a scripted model; expected drafts are derived from core's offline
 * reader and `validateBriefDraft`, never typed by hand.
 */
import {
  MAX_BRIEF_CHARS,
  briefResponseSchema,
  readBriefOffline,
  validateBriefDraft,
} from '@intezaam/core';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { cleanUserText } from '../services/service-kit.js';
import { BRIEF_TEXT, TODAY, makeApp, replyWith, statusError } from './helpers.js';

/** What the model sees: the sanitised, redacted brief. */
const SEEN = cleanUserText(BRIEF_TEXT, MAX_BRIEF_CHARS).text;

/** A faithful model reply, derived from the offline reader of the same text. */
const FAITHFUL_REPLY = readBriefOffline(SEEN, TODAY);

function expectedBody(reply: typeof FAITHFUL_REPLY): Record<string, unknown> {
  const checked = validateBriefDraft(reply, SEEN, TODAY);
  return {
    draft: checked.draft,
    filled: checked.filled,
    missing: checked.missing,
    understood: checked.understood,
  };
}

const body = { text: BRIEF_TEXT, todayIso: TODAY };

describe('POST /api/brief offline', () => {
  it('reads the brief with the offline twin and says why', async () => {
    const res = await request(makeApp().app).post('/api/brief').send(body);
    expect(res.status).toBe(200);
    const parsed = briefResponseSchema.parse(res.body);
    expect(parsed).toMatchObject(expectedBody(FAITHFUL_REPLY));
    expect(parsed.provenance.mode).toBe('offline');
    expect(parsed.provenance.reason).toBe('not_configured');
  });

  it('rejects a brief with no readable characters after sanitising', async () => {
    const res = await request(makeApp().app)
      .post('/api/brief')
      .send({ text: '​​​​', todayIso: TODAY });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});

describe('POST /api/brief with Gemini', () => {
  it('returns the guarded draft and redacts and fences the brief before the model sees it', async () => {
    const { app, calls } = makeApp({ script: replyWith(FAITHFUL_REPLY) });
    const res = await request(app).post('/api/brief').send(body);
    const parsed = briefResponseSchema.parse(res.body);
    expect(parsed).toMatchObject(expectedBody(FAITHFUL_REPLY));
    expect(parsed.provenance).toMatchObject({ mode: 'gemini', models: ['model-a'] });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.prompt).toContain('[PHONE]');
    expect(calls[0]?.prompt).not.toContain('9876543210');
    expect(calls[0]?.prompt).toMatch(/<<<BRIEF_[a-f0-9]{16}>>>/);
  });

  it('drops fields whose evidence quote is not in the brief (the evidence guard)', async () => {
    const invented = {
      ...FAITHFUL_REPLY,
      city: 'Mumbai',
      guestsText: '500 log',
      evidence: [
        ...FAITHFUL_REPLY.evidence.filter(
          (item) => item.field !== 'city' && item.field !== 'guests',
        ),
        { field: 'city' as const, quote: 'Mumbai' },
        { field: 'guests' as const, quote: '500 log' },
      ],
    };
    const res = await request(makeApp({ script: replyWith(invented) }).app)
      .post('/api/brief')
      .send(body);
    const parsed = briefResponseSchema.parse(res.body);
    expect(parsed.draft.city).toBeUndefined();
    expect(parsed.draft.guests).toBeUndefined();
    expect(parsed.filled).not.toContain('city');
    expect(parsed).toMatchObject(expectedBody(invented));
  });

  it('serves the same brief from cache without a second model call', async () => {
    const { app, calls } = makeApp({ script: replyWith(FAITHFUL_REPLY) });
    const first = await request(app).post('/api/brief').send(body);
    const second = await request(app).post('/api/brief').send(body);
    expect(calls).toHaveLength(1);
    expect(second.body.draft).toEqual(first.body.draft);
    expect(second.body.provenance.mode).toBe('gemini');
    expect(second.body.provenance.steps.map((step: { name: string }) => step.name)).toContain(
      'cache-hit',
    );
  });

  it('falls back to the offline reader with reason upstream_error when every model fails', async () => {
    const { app, calls, logs } = makeApp({ script: () => Promise.reject(statusError(503)) });
    const res = await request(app).post('/api/brief').send(body);
    const parsed = briefResponseSchema.parse(res.body);
    expect(calls).toHaveLength(3);
    expect(parsed).toMatchObject(expectedBody(FAITHFUL_REPLY));
    expect(parsed.provenance.reason).toBe('upstream_error');
    expect(logs.some((line) => line.includes('model job fell back to offline'))).toBe(true);
    expect(logs.join('\n')).not.toContain('secret body');
  });
});
