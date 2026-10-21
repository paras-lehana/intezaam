/**
 * Tests for engine/context.ts — the CTX-01…08 classifiers and the normalised context.
 *
 * Responsibility: prove the tier comes from the override, the gazetteer or the unknown-city
 * default; anchors and catering tiers; date modes (dated, undated, past, today); season,
 * rain and calendar rules; default functions; footfall; and the estimate fallback when no
 * budget is given. Boundary: expected values come from the domain tables.
 */
import { describe, expect, it } from 'vitest';
import { UNKNOWN_CITY_TIER } from '../domain/cities.js';
import { findCity } from '../domain/city-table.js';
import { CROWD_CLASS_MAX, crowdClassFor } from '../domain/crowd.js';
import { EVENT_KIND_PROFILES } from '../domain/event-kinds.js';
import { scaleBandFor } from '../domain/scale.js';
import { TRADITION_PROFILES } from '../domain/traditions.js';
import { estimateSpend } from '../engine/estimate.js';
import { classifyContext, resolveFunctions } from '../engine/context.js';
import {
  birthday,
  classified,
  community,
  homePuja,
  inDays,
  normalised,
  TODAY,
  undated,
  wedding,
  withoutBudget,
} from './fixtures/engine-contexts.js';

describe('resolveFunctions', () => {
  it('keeps the user list, else the tradition sequence, else the kind default', () => {
    expect(resolveFunctions(wedding())).toEqual({
      functions: ['mehendi', 'sangeet', 'wedding', 'reception'],
      source: 'user',
    });
    expect(resolveFunctions(wedding({ functions: [], tradition: 'muslim' })).functions).toEqual([
      ...TRADITION_PROFILES.muslim.defaultFunctions,
    ]);
    expect(resolveFunctions(homePuja()).functions).toEqual([
      ...EVENT_KIND_PROFILES['home-puja'].defaultFunctions,
    ]);
    const { tradition: _none, ...noTradition } = wedding({ functions: [] });
    expect(resolveFunctions(noTradition).source).toBe('kind');
  });
});

describe('classifyContext: city tier (CTX-02)', () => {
  it('uses the gazetteer and keeps the anchor, with Jaipur catering as a metro', () => {
    const ctx = classified(wedding());
    expect(ctx.tier).toBe(findCity('Jaipur')?.tier);
    expect(ctx.tierSource).toBe('gazetteer');
    expect(ctx.anchor).toBe('jaipur');
    expect(ctx.cateringTier).toBe('metro');
  });

  it('lets the user override the tier and drops the anchor', () => {
    const ctx = classified(wedding({ tier: 'tier3' }));
    expect([ctx.tier, ctx.tierSource, ctx.anchor, ctx.cateringTier]).toEqual([
      'tier3',
      'override',
      null,
      'tier3',
    ]);
  });

  it('prices an unknown city as the default tier and echoes the typed name', () => {
    const ctx = classified(wedding({ city: '  Atlantis ' }));
    expect([ctx.tier, ctx.tierSource, ctx.city, ctx.cityName]).toEqual([
      UNKNOWN_CITY_TIER,
      'unknown-city',
      null,
      'Atlantis',
    ]);
  });

  it('keeps the tier for an anchor city that caters at its own tier', () => {
    const ctx = classified(wedding({ city: 'Kolkata' }));
    expect(ctx.cateringTier).toBe(ctx.tier);
  });
});

describe('classifyContext: dates and seasons (CTX-04, CTX-05, CTX-07, CTX-08)', () => {
  it('counts the days to a future date and reads its season', () => {
    const ctx = classified(wedding({ dateIso: '2026-11-25' }));
    expect([ctx.dateMode, ctx.daysToEvent]).toEqual(['dated', 36]);
    expect(ctx.season).toMatchObject({ peak: true, offPeak: false, weekday: true, month: 11 });
    expect(ctx.hinduCalendar).toBe(true);
  });

  it('treats today as dated with zero days left', () => {
    expect(classified(wedding({ dateIso: TODAY })).daysToEvent).toBe(0);
  });

  it('switches to past mode for an earlier date and undated mode for an open one', () => {
    expect(classified(wedding({ dateIso: inDays(-1) })).dateMode).toBe('past');
    const open = classified(undated(wedding()));
    expect([open.dateMode, open.dateIso, open.daysToEvent, open.season.month]).toEqual([
      'undated',
      null,
      null,
      null,
    ]);
  });

  it('treats an unusable today as undated rather than guessing', () => {
    const ctx = classifyContext(wedding(), 'not-a-date');
    expect([ctx.dateMode, ctx.daysToEvent]).toEqual(['undated', null]);
  });

  it('lists Chaturmas and Kharmas only for Hindu traditions', () => {
    expect(classified(wedding({ dateIso: '2026-12-20' })).season.pauses).toEqual([
      'kharmas-2026-winter',
    ]);
    const nikah = classified(wedding({ dateIso: '2026-12-20', tradition: 'muslim' }));
    expect([nikah.hinduCalendar, nikah.season.pauses]).toEqual([false, []]);
  });

  it('flags rain only for open-air events in the city’s rainy months', () => {
    expect(classified(birthday()).rainRisk).toBe(true);
    expect(classified(birthday({ venueSetting: 'indoor' })).rainRisk).toBe(false);
    const chennaiNovember = classified(wedding({ city: 'Chennai', dateIso: '2026-11-25' }));
    expect(chennaiNovember.rainRisk).toBe(true);
    expect(classified(wedding({ dateIso: '2026-11-25' })).rainRisk).toBe(false);
  });
});

describe('classifyContext: people and settings (CTX-03, CTX-06)', () => {
  it('derives the scale band, footfall and crowd class', () => {
    const ctx = classified(community());
    expect(ctx.scale).toBe(scaleBandFor(ctx.guests));
    expect(ctx.footfall).toBe(community().community?.footfall);
    expect(ctx.crowdClass).toBe(crowdClassFor(ctx.footfall));
    const small = classified(wedding({ guests: CROWD_CLASS_MAX.small }));
    expect([small.footfall, small.crowdClass]).toEqual([CROWD_CLASS_MAX.small, 'small']);
  });

  it('reads planner help, sound and access needs from the input', () => {
    const ctx = classified(wedding({ helpLevel: 'planner' }));
    expect(ctx.plannerHired).toBe(true);
    expect(ctx.amplifiedSound).toBe(true);
    expect(ctx.accessNeeds).toEqual(['elderly']);
    expect(ctx.openAir).toBe(true);
    expect(classified(homePuja()).openAir).toBe(false);
  });
});

describe('normaliseContext', () => {
  it('keeps the user budget and derives the per-guest figure', () => {
    const ctx = normalised(wedding());
    expect(ctx.budgetSource).toBe('user');
    expect(ctx.budgetPerGuestInr).toBe(Math.round(ctx.budgetInr / ctx.guests));
  });

  it('uses the mid estimate when the user asks us to estimate', () => {
    const ctx = normalised(withoutBudget(wedding()));
    expect(ctx.budgetSource).toBe('estimate');
    expect(ctx.budgetInr).toBe(estimateSpend(classified(withoutBudget(wedding()))).mid);
    expect(ctx.estimate).toEqual(estimateSpend(classified(wedding())));
  });
});
