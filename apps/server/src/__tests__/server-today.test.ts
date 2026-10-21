/**
 * Tests for the server-clock check of `todayIso` (middleware/server-today.ts).
 *
 * Responsibility: prove a far-off "today" is refused with 400 on every route that carries one
 * (including the far-future probe that used to end in a 500 and an ERROR log), that the days
 * either side, which other time zones send, still plan, that a malformed date is left to the
 * schema's own message, and that the received value is never echoed. Boundary: supertest
 * against buildApp with the fake clock, which reads TODAY in India.
 */
import { addDaysIso, errorResponseSchema, planResponseSchema } from '@intezaam/core';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import {
  TODAY_MISMATCH_MESSAGE,
  indiaTodayIso,
  isPlausibleToday,
} from '../middleware/server-today.js';
import { CLOCK_START_MS, TODAY, makeApp, weddingContext } from './helpers.js';

/** The probe from the security review: a year the engine was never built for. */
const FAR_FUTURE = '9999-12-01';

/** Midnight in India (UTC+05:30) is 18:30 UTC on the evening before. */
const INDIA_MIDNIGHT_MS = Date.parse(`${TODAY}T18:30:00.000Z`);

/**
 * Every route whose body carries `todayIso`. The check runs before the schema, so a body with
 * that one field is enough to reach it.
 */
const DATED_ROUTES = [
  '/api/brief',
  '/api/plan',
  '/api/plan/narration',
  '/api/plan/what-if',
  '/api/quotes/compare',
  '/api/drafts',
  '/api/ask',
] as const;

const context = weddingContext();

describe('indiaTodayIso and isPlausibleToday', () => {
  it('reads the server clock as the date in India, which turns over at 18:30 UTC', () => {
    expect(indiaTodayIso(CLOCK_START_MS)).toBe(TODAY);
    expect(indiaTodayIso(INDIA_MIDNIGHT_MS - 1)).toBe(TODAY);
    expect(indiaTodayIso(INDIA_MIDNIGHT_MS)).toBe(addDaysIso(TODAY, 1));
  });

  it('accepts one day either way, refuses more, and leaves an unreadable date to the schema', () => {
    const near = [-1, 0, 1].map((days) => addDaysIso(TODAY, days) ?? '');
    expect(near.map((iso) => isPlausibleToday(iso, CLOCK_START_MS))).toEqual([true, true, true]);
    const far = [-2, 2].map((days) => addDaysIso(TODAY, days) ?? '');
    expect(far.map((iso) => isPlausibleToday(iso, CLOCK_START_MS))).toEqual([false, false]);
    expect(isPlausibleToday('2026-02-30', CLOCK_START_MS)).toBe(true);
  });
});

describe('routes that carry todayIso', () => {
  it.each(DATED_ROUTES)(
    '%s refuses a far-off today before validation, without echoing it',
    async (path) => {
      const { app, calls } = makeApp({ script: () => Promise.resolve('{}') });
      const res = await request(app).post(path).send({ todayIso: FAR_FUTURE });
      expect(res.status).toBe(400);
      expect(errorResponseSchema.parse(res.body).error).toMatchObject({
        code: 'VALIDATION_FAILED',
        message: TODAY_MISMATCH_MESSAGE,
      });
      expect(res.text).not.toContain(FAR_FUTURE);
      expect(calls).toHaveLength(0);
    },
  );

  it('turns the far-future plan probe into a 400 instead of a 500 and an ERROR log', async () => {
    const { app, logs } = makeApp();
    const res = await request(app)
      .post('/api/plan')
      .send({ context: { ...context, dateIso: '9999-12-30' }, todayIso: FAR_FUTURE });
    expect(res.status).toBe(400);
    expect(logs.some((line) => line.includes('"severity":"ERROR"'))).toBe(false);
  });

  it('plans for a client whose own date is a day either side of India’s', async () => {
    const { app } = makeApp();
    for (const days of [-1, 1]) {
      const res = await request(app)
        .post('/api/plan')
        .send({ context, todayIso: addDaysIso(TODAY, days) });
      expect(res.status).toBe(200);
      expect(planResponseSchema.safeParse(res.body).success).toBe(true);
    }
  });

  it('leaves a malformed date to the schema, which names the field', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/plan').send({ context, todayIso: '20261020' });
    expect(res.status).toBe(400);
    const message = errorResponseSchema.parse(res.body).error.message;
    expect(message).toContain('todayIso');
    expect(message).not.toBe(TODAY_MISMATCH_MESSAGE);
  });
});
