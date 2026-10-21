/**
 * Tests for POST /api/plan (engine + GenAI job 2), POST /api/plan/narration and
 * POST /api/plan/what-if.
 *
 * Responsibility: prove the plan is exactly core's `buildPlan`, the narration costs ONE model
 * call and is cached by plan facts, the faithfulness guard strips an invented amount, the idea
 * guard drops a dish the diet forbids, the daily quota falls back with its reason, the
 * narration-only route returns the same narration without the plan, and what-if returns
 * core's diff. Boundary: supertest with a scripted model; every expectation is derived
 * from core at test time.
 */
import {
  MIN_IDEAS,
  applyPatch,
  buildPlan,
  diffPlans,
  narrateOffline,
  narrationResponseSchema,
  planResponseSchema,
  whatIfResponseSchema,
} from '@intezaam/core';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createDailyBudget } from '../services/daily-budget.js';
import {
  TEST_MODELS,
  TODAY,
  createFakeClock,
  ganeshContext,
  makeApp,
  makeClient,
  replyWith,
  scriptedCaller,
  weddingContext,
} from './helpers.js';

const context = weddingContext();
const built = buildPlan(context, TODAY);
if (!built.ok) throw new Error('the sample wedding must plan');
const plan = built.value;

/** A faithful reply: the offline narration of the same plan (every number comes from it). */
const FAITHFUL = narrateOffline(plan, context);

/** Round-trips through JSON, as the response does (drops undefined optional fields). */
function wire(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

const body = { context, todayIso: TODAY };

describe('POST /api/plan', () => {
  it('returns exactly the core plan and the offline narration when AI is off', async () => {
    const res = await request(makeApp().app).post('/api/plan').send(body);
    expect(res.status).toBe(200);
    const parsed = planResponseSchema.parse(res.body);
    expect(res.body.plan).toEqual(wire(plan));
    expect(parsed.narration.headline).toBe(FAITHFUL.headline);
    expect(parsed.narration.ideas.length).toBeGreaterThanOrEqual(MIN_IDEAS);
    expect(parsed.provenance.mode).toBe('offline');
    expect(parsed.provenance.reason).toBe('not_configured');
  });

  it('narrates with ONE model call and attaches cost bands and YouTube links by code', async () => {
    const { app, calls } = makeApp({ script: replyWith(FAITHFUL) });
    const res = await request(app).post('/api/plan').send(body);
    const parsed = planResponseSchema.parse(res.body);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.json).toBe(true);
    expect(parsed.provenance).toMatchObject({ mode: 'gemini', models: ['model-a'] });
    expect(parsed.narration.summary).toBe(FAITHFUL.summary);
    expect(
      parsed.narration.ideas.every((idea) =>
        idea.youtubeUrl.startsWith('https://www.youtube.com/'),
      ),
    ).toBe(true);
  });

  it('replaces a sentence with an invented amount by the template (faithfulness guard)', async () => {
    const invented = {
      ...FAITHFUL,
      summary: 'Relax: this wedding will cost only ₹4,99,999 in total.',
    };
    const res = await request(makeApp({ script: replyWith(invented) }).app)
      .post('/api/plan')
      .send(body);
    const parsed = planResponseSchema.parse(res.body);
    expect(parsed.narration.summary).toBe(FAITHFUL.summary);
    expect(res.text).not.toContain('4,99,999');
    expect(parsed.narration.headline).toBe(FAITHFUL.headline);
  });

  it('drops an idea the vegetarian menu forbids and tops the board up with curated ideas', async () => {
    const [first] = FAITHFUL.ideas;
    if (first === undefined) throw new Error('the offline narration has ideas');
    const meat = {
      ...first,
      title: 'Live chicken tikka counter',
      description: 'Chicken tikka grilled to order.',
    };
    const reply = { ...FAITHFUL, ideas: [meat, ...FAITHFUL.ideas.slice(1, MIN_IDEAS)] };
    const res = await request(makeApp({ script: replyWith(reply) }).app)
      .post('/api/plan')
      .send(body);
    const titles = planResponseSchema.parse(res.body).narration.ideas.map((idea) => idea.title);
    expect(titles).not.toContain(meat.title);
    expect(titles.length).toBeGreaterThanOrEqual(MIN_IDEAS);
  });

  it('serves the same plan facts from cache: no second model call', async () => {
    const { app, calls } = makeApp({ script: replyWith(FAITHFUL) });
    await request(app).post('/api/plan').send(body);
    const second = await request(app).post('/api/plan').send(body);
    expect(calls).toHaveLength(1);
    expect(second.body.provenance.mode).toBe('gemini');
    expect(second.body.provenance.steps.map((step: { name: string }) => step.name)).toContain(
      'cache-hit',
    );
  });

  it('serves offline with reason daily_quota when every model has spent its budget', async () => {
    const scripted = scriptedCaller(replyWith(FAITHFUL));
    const budget = createDailyBudget({
      limits: new Map(TEST_MODELS.map((model) => [model, 0])),
      now: createFakeClock().now,
    });
    const { app } = makeApp({ genai: makeClient(scripted.caller, Date.now, budget) });
    const res = await request(app).post('/api/plan').send(body);
    const parsed = planResponseSchema.parse(res.body);
    expect(scripted.calls).toHaveLength(0);
    expect(parsed.provenance.mode).toBe('offline');
    expect(parsed.provenance.reason).toBe('daily_quota');
  });

  it('plans a community event too: exactly the core plan, community section included', async () => {
    const community = ganeshContext();
    const expected = buildPlan(community, TODAY);
    if (!expected.ok) throw new Error('the sample Ganesh utsav must plan');
    expect(expected.value.community).toBeDefined();
    const res = await request(makeApp().app)
      .post('/api/plan')
      .send({ context: community, todayIso: TODAY });
    expect(res.status).toBe(200);
    expect(planResponseSchema.safeParse(res.body).success).toBe(true);
    expect(res.body.plan).toEqual(wire(expected.value));
  });
});

describe('POST /api/plan/narration', () => {
  it('returns the narration /api/plan gives, without the plan, from the same cache', async () => {
    const { app, calls } = makeApp({ script: replyWith(FAITHFUL) });
    const full = planResponseSchema.parse((await request(app).post('/api/plan').send(body)).body);
    const res = await request(app).post('/api/plan/narration').send(body);
    expect(res.status).toBe(200);
    // The strict schema refuses a `plan` key, so this also proves the plan is not sent.
    const parsed = narrationResponseSchema.parse(res.body);
    expect(parsed.narration).toEqual(full.narration);
    expect(calls).toHaveLength(1);
    expect(parsed.provenance.steps.map((step) => step.name)).toContain('cache-hit');
  });

  it('narrates offline with the plan route’s reason when AI is off', async () => {
    const res = await request(makeApp().app).post('/api/plan/narration').send(body);
    const parsed = narrationResponseSchema.parse(res.body);
    expect(parsed.narration.headline).toBe(FAITHFUL.headline);
    expect(parsed.provenance).toMatchObject({ mode: 'offline', reason: 'not_configured' });
  });

  it('validates the body like /api/plan', async () => {
    const res = await request(makeApp().app)
      .post('/api/plan/narration')
      .send({ ...body, extra: true });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/plan/what-if', () => {
  it('returns core plans before and after the patch and their diff, with no model call', async () => {
    const patch = { ops: [{ op: 'setGuests' as const, value: 220 }] };
    const after = buildPlan(applyPatch(context, patch), TODAY);
    if (!after.ok) throw new Error('the patched wedding must plan');
    const { app, calls } = makeApp({ script: replyWith(FAITHFUL) });
    const res = await request(app)
      .post('/api/plan/what-if')
      .send({ ...body, patch });
    expect(res.status).toBe(200);
    expect(whatIfResponseSchema.safeParse(res.body).success).toBe(true);
    expect(res.body).toEqual(
      wire({ before: plan, after: after.value, diff: diffPlans(plan, after.value) }),
    );
    expect(calls).toHaveLength(0);
  });

  it('rejects a patch that moves the date outside the planning window, without echoing it', async () => {
    const patch = { ops: [{ op: 'setDate' as const, value: '2031-01-01' }] };
    const res = await request(makeApp().app)
      .post('/api/plan/what-if')
      .send({ ...body, patch });
    expect(res.status).toBe(400);
    expect(res.text).not.toContain('2031');
  });
});
