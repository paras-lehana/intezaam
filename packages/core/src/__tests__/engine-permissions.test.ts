/**
 * Tests for engine/permissions.ts — permissions and noise rules (PERM-01…08, TL-10).
 *
 * Responsibility: prove which permissions apply to which events, that the night-sound
 * blocker fires after 10 pm (not at it) and only for open-air amplified sound, that the
 * pandal window is timed from the festival date (opens, closes, valid until the day after
 * it ends), that the cracker slot follows the occasion and state and says "green only"
 * just for Delhi-NCR, and that every item says "verify locally". Boundary: unit tests.
 */
import { describe, expect, it } from 'vitest';
import { addDaysIso } from '../domain/calendar.js';
import { FESTIVAL_DATES } from '../domain/festivals.js';
import { CRACKER_SLOTS, VERIFY_LOCALLY_NOTE } from '../domain/permissions.js';
import {
  buildPermissions,
  crackerOccasion,
  PANDAL_WINDOW_CLOSES_DAYS,
  PANDAL_WINDOW_OPENS_DAYS,
} from '../engine/permissions.js';
import { createTraceLog } from '../engine/trace.js';
import { permissionSchema } from '../schemas/plan-safety.js';
import type { EventContext } from '../schemas/context.js';
import { classified, community, homePuja, undated, wedding } from './fixtures/engine-contexts.js';

function permissionsFor(context: EventContext): ReturnType<typeof buildPermissions> {
  return buildPermissions(classified(context), createTraceLog());
}

const sound = wedding().sound ?? {
  amplified: true,
  endHhmm: '22:00',
  nearSilenceZone: false,
  crackers: false,
};
const extras = community().community ?? { premises: 'private' as const, days: 1 };

describe('buildPermissions', () => {
  it('blocks open-air amplified sound after 10 pm, and only then', () => {
    const late = permissionsFor(wedding()).find((p) => p.id === 'night-sound');
    expect([late?.required, late?.blocker]).toEqual([true, true]);
    const onTime = permissionsFor(wedding({ sound: { ...sound, endHhmm: '22:00' } }));
    expect(onTime.find((p) => p.id === 'night-sound')?.blocker).toBe(false);
    expect(
      permissionsFor(wedding({ venueSetting: 'indoor' })).some((p) => p.id === 'night-sound'),
    ).toBe(false);
  });

  it('lists only what a quiet indoor family function needs', () => {
    expect(permissionsFor(homePuja({ sound: undefined }))).toEqual([]);
  });

  it('records "none" for the sound of a community event without amplified sound', () => {
    const trace = createTraceLog();
    const quiet = buildPermissions(classified(community({ sound: undefined })), trace);
    expect(quiet.some((p) => p.id === 'night-sound')).toBe(false);
    const soundEnds = trace.items()[0]?.inputs.find((input) => input.key === 'sound ends');
    expect(soundEnds?.value).toBe('none');
  });

  it('asks about silence zones whenever sound is amplified, required near one', () => {
    const near = permissionsFor(wedding({ sound: { ...sound, nearSilenceZone: true } }));
    expect(near.find((p) => p.id === 'silence-zone')?.required).toBe(true);
    expect(permissionsFor(wedding()).find((p) => p.id === 'silence-zone')?.required).toBe(false);
  });

  it('needs pandal, police and procession permissions on public ground', () => {
    const open = permissionsFor(community({ community: { ...extras, premises: 'public' } }));
    expect(open.find((p) => p.id === 'pandal')?.required).toBe(true);
    expect(open.find((p) => p.id === 'procession')?.required).toBe(true);
    const inside = permissionsFor(community());
    expect(inside.find((p) => p.id === 'pandal')?.required).toBe(false);
    expect(inside.find((p) => p.id === 'society')?.required).toBe(true);
  });

  it('times the pandal application from the festival date (TL-10)', () => {
    const date = community().dateIso ?? '';
    const pandal = permissionsFor(community()).find((p) => p.id === 'pandal');
    expect(pandal?.when).toContain(addDaysIso(date, -PANDAL_WINDOW_OPENS_DAYS) ?? 'x');
    expect(pandal?.when).toContain(addDaysIso(date, -PANDAL_WINDOW_CLOSES_DAYS) ?? 'x');
    const days = community().community?.days ?? 1;
    expect(pandal?.when).toContain(`valid until ${addDaysIso(date, days) ?? 'x'}`);
    expect(pandal?.traceIds.some((id) => id.startsWith('TL-10'))).toBe(true);
    const { community: _details, ...bare } = community();
    const oneDay = permissionsFor(bare).find((p) => p.id === 'pandal');
    expect(oneDay?.when).toContain(`valid until ${addDaysIso(date, 1) ?? 'x'}`);
    const open = permissionsFor(undated(community())).find((p) => p.id === 'pandal');
    expect(open?.when).toContain('at least 30 days');
  });

  it('notes the cracker rules, green-only just for Delhi-NCR', () => {
    const crackers = { ...sound, crackers: true };
    const note = (context: EventContext): string =>
      permissionsFor(context).find((p) => p.id === 'firecrackers')?.note ?? '';
    expect(note(wedding({ city: 'Delhi', sound: crackers }))).toContain('green');
    const jaipur = note(wedding({ sound: crackers }));
    expect(jaipur).toContain('Reduced-emission');
    expect(jaipur).toContain(CRACKER_SLOTS.diwali);
  });

  it('picks the cracker slot by occasion and state (PERM-07)', () => {
    const occasion = (overrides: Partial<EventContext>): string =>
      crackerOccasion(classified(wedding(overrides)));
    expect(occasion({})).toBe('diwali');
    expect(occasion({ city: 'Chennai' })).toBe('southern-states-diwali');
    const gurpurab = FESTIVAL_DATES['gurpurab-2027'].datesIso[0] ?? '';
    expect(occasion({ dateIso: gurpurab })).toBe('gurpurab');
    const christmas = FESTIVAL_DATES['christmas-2027'].datesIso[0] ?? '';
    expect(occasion({ dateIso: christmas })).toBe('christmas-new-year');
    expect(occasion({ dateIso: '2027-12-31' })).toBe('christmas-new-year');
    expect(crackerOccasion(classified(undated(wedding({ city: 'Chennai' }))))).toBe(
      'southern-states-diwali',
    );
    expect(occasion({ city: 'Somewhere New' })).toBe('diwali');
  });

  it('is schema-valid, cites its sources and always says to verify locally', () => {
    for (const permission of permissionsFor(
      community({ community: { ...extras, premises: 'public' } }),
    )) {
      expect(permissionSchema.safeParse(permission).success).toBe(true);
      expect(permission.note).toContain(VERIFY_LOCALLY_NOTE);
      expect(permission.sourceIds.length).toBeGreaterThan(0);
    }
  });
});
