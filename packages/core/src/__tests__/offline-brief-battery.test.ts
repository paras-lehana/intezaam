/**
 * The labelled 60-brief battery (research note 09 §5.4) run through the offline brief reader
 * and the evidence guard, exactly as the server runs an offline reply.
 *
 * Responsibility: for every English, Hindi, Hinglish and mixed brief — the fields filled, the
 * core fields left for the form, the fields that must stay empty, the reply language, and
 * that every evidence quote is a substring of the brief. The puja and festival briefs beyond the
 * battery run through the same per-case checks. Boundary: expected values are the cases'
 * labels; festival months come from the year-keyed festival table.
 */
import { describe, expect, it } from 'vitest';
import { isoMonth } from '../domain/calendar.js';
import { validateBriefDraft } from '../genai/brief-guard.js';
import { readBriefOffline } from '../offline/read-brief.js';
import { FESTIVAL_ANCHORS, type FestivalKey } from '../offline/vocab/festivals.js';
import { MAX_BRIEF_CHARS } from '../schemas/limits.js';
import { foldForMatch } from '../security/normalise.js';
import { sanitizeUserText } from '../security/sanitize.js';
import { BATTERY_TODAY, LANGUAGE_OF, type BriefCase } from './fixtures/brief-case.js';
import { EN_BRIEFS } from './fixtures/brief-cases-en.js';
import { HI_BRIEFS } from './fixtures/brief-cases-hi.js';
import { HINGLISH_DATE_BRIEFS } from './fixtures/brief-cases-hinglish-dates.js';
import { HINGLISH_BRIEFS } from './fixtures/brief-cases-hinglish.js';
import { MIXED_GUARDRAIL_BRIEFS } from './fixtures/brief-cases-mixed-guardrails.js';
import { PUJA_FESTIVAL_BRIEFS } from './fixtures/brief-cases-puja-festival.js';

const BATTERY: readonly BriefCase[] = [
  ...EN_BRIEFS,
  ...HI_BRIEFS,
  ...HINGLISH_BRIEFS,
  ...HINGLISH_DATE_BRIEFS,
  ...MIXED_GUARDRAIL_BRIEFS,
];

/** The research note's battery has sixty rows (09 §5.4). */
const BATTERY_SIZE = 60;

/** Every labelled case: the battery plus the puja and festival briefs beyond it. */
const CASES: readonly BriefCase[] = [...BATTERY, ...PUJA_FESTIVAL_BRIEFS];

/** The months a festival's next occurrence (on or after the battery day) can fall in. */
function festivalMonths(key: FestivalKey): number[] {
  const years = Object.values(FESTIVAL_ANCHORS[key].dates);
  const next = years.find((dates) => dates.some((date) => date >= BATTERY_TODAY)) ?? [];
  return next.flatMap((date) => {
    const month = isoMonth(date);
    return month === undefined ? [] : [month];
  });
}

/**
 * Hinglish rows with only one Hindi word ("1.5 cr ka budget", "30 log", "50000 log"): the
 * two-word register rule keeps them English, so their drafts default to English templates.
 */
const ONE_HINDI_WORD_ROWS: ReadonlySet<string> = new Set(['B22', 'B54', 'B59', 'P05']);

function read(brief: BriefCase): ReturnType<typeof validateBriefDraft> {
  return validateBriefDraft(readBriefOffline(brief.text, BATTERY_TODAY), brief.text, BATTERY_TODAY);
}

describe('the labelled brief battery', () => {
  it('has sixty distinct cases across the four language groups', () => {
    expect(BATTERY).toHaveLength(BATTERY_SIZE);
    expect(new Set(BATTERY.map((brief) => brief.id)).size).toBe(BATTERY_SIZE);
    expect(new Set(BATTERY.map((brief) => brief.lang))).toEqual(new Set(['EN', 'HI', 'HG', 'MX']));
  });

  it('keeps the puja and festival cases apart from the battery ids', () => {
    expect(PUJA_FESTIVAL_BRIEFS.length).toBeGreaterThan(0);
    expect(new Set(CASES.map((brief) => brief.id)).size).toBe(CASES.length);
  });

  it.each(CASES.map((brief) => [brief.id, brief] as const))(
    '%s fills the labelled fields',
    (_id, brief) => {
      const result = read(brief);
      expect(result.draft).toMatchObject(brief.expect);
      expect(result.draft.language).toBe(LANGUAGE_OF[brief.lang]);
      for (const key of brief.absent) expect(result.draft[key]).toBeUndefined();
      if (brief.festival !== undefined)
        expect(festivalMonths(brief.festival)).toContain(result.draft.month);
    },
  );

  it.each(CASES.map((brief) => [brief.id, brief] as const))(
    '%s marks the Hinglish register only for romanised Hindi (09 §5.2.7)',
    (_id, brief) => {
      const hinglish = brief.lang === 'HG' && !ONE_HINDI_WORD_ROWS.has(brief.id);
      expect(read(brief).draft.hinglish === true).toBe(hinglish);
    },
  );

  it.each(CASES.map((brief) => [brief.id, brief] as const))(
    '%s leaves the labelled core fields for the form',
    (_id, brief) => {
      const offline = readBriefOffline(brief.text, BATTERY_TODAY);
      expect(read(brief).missing).toEqual(brief.missing);
      expect(offline.missing).toEqual(brief.missing);
    },
  );

  it.each(CASES.map((brief) => [brief.id, brief] as const))(
    '%s quotes evidence verbatim from the brief',
    (_id, brief) => {
      const haystack = foldForMatch(sanitizeUserText(brief.text, MAX_BRIEF_CHARS));
      const offline = readBriefOffline(brief.text, BATTERY_TODAY);
      for (const entry of offline.evidence) expect(haystack).toContain(foldForMatch(entry.quote));
      // The offline reader is grounded by construction, so the guard drops nothing it claimed.
      expect(read(brief).dropped.filter((drop) => drop.reason !== 'out-of-range')).toEqual([]);
    },
  );

  it('reads nukta, chandrabindu and Devanagari-digit spellings of one brief identically', () => {
    const byId = new Map(BATTERY.map((brief) => [brief.id, brief]));
    for (const [left, right] of [
      ['B26', 'B27'],
      ['B30', 'B31'],
    ] as const) {
      const a = byId.get(left);
      const b = byId.get(right);
      expect(a === undefined || b === undefined).toBe(false);
      if (a !== undefined && b !== undefined) expect(read(a).draft).toEqual(read(b).draft);
    }
  });

  it('refuses out-of-range numbers with a reason instead of clamping them (B59)', () => {
    const brief = MIXED_GUARDRAIL_BRIEFS.find((entry) => entry.id === 'B59');
    expect(brief).toBeDefined();
    if (brief === undefined) return;
    expect(read(brief).dropped).toEqual([
      { field: 'guests', reason: 'out-of-range' },
      { field: 'budget', reason: 'out-of-range' },
    ]);
  });
});
