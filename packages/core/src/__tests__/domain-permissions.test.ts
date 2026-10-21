/**
 * Tests for domain/permissions.ts: permissions and the noise-rule constants.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import {
  CRACKER_OCCASIONS,
  CRACKER_SLOTS,
  CRACKER_WINDOW,
  FESTIVE_EXEMPTION_END_HHMM,
  FESTIVE_EXEMPTION_MAX_DAYS,
  NOISE_CURFEW_END_HHMM,
  NOISE_CURFEW_START_HHMM,
  NOISE_LIMITS_DBA,
  NOISE_ZONES,
  PERMISSION_IDS,
  PERMISSIONS,
} from '../domain/permissions.js';
import { isSourceId } from '../domain/sources.js';
import { hhmmSchema } from '../schemas/common.js';

describe('permissions (PERM-01…08)', () => {
  it('one permission per PERM rule, each with a registered source', () => {
    const ruleIds = PERMISSION_IDS.map((id) => PERMISSIONS[id].ruleId);
    expect(new Set(ruleIds).size).toBe(PERMISSION_IDS.length);
    for (const ruleId of ruleIds) expect(ruleId.startsWith('PERM-')).toBe(true);
    for (const id of PERMISSION_IDS) {
      for (const sourceId of PERMISSIONS[id].sourceIds) expect(isSourceId(sourceId)).toBe(true);
    }
  });

  it('the night ban is a grade-A rule', () => {
    expect(PERMISSIONS['night-sound'].confidence).toBe('A');
    expect(PERMISSIONS['night-sound'].ruleId).toBe('PERM-02');
  });

  it('crackers have a court slot per occasion and cite the 2018 orders, not a green-only rule everywhere', () => {
    for (const occasion of CRACKER_OCCASIONS)
      expect(CRACKER_SLOTS[occasion].length).toBeGreaterThan(0);
    expect(PERMISSIONS.firecrackers.sourceIds).toContain('S-SCCONLINE-2018');
    expect(PERMISSIONS.firecrackers.timing).toContain('green only in Delhi-NCR');
  });
});

describe('noise rules', () => {
  it('curfew, exemption and cracker times are valid clock times', () => {
    const times = [
      NOISE_CURFEW_START_HHMM,
      NOISE_CURFEW_END_HHMM,
      FESTIVE_EXEMPTION_END_HHMM,
      CRACKER_WINDOW.startHhmm,
      CRACKER_WINDOW.endHhmm,
    ];
    for (const time of times) expect(hhmmSchema.safeParse(time).success).toBe(true);
    expect(CRACKER_WINDOW.endHhmm <= NOISE_CURFEW_START_HHMM).toBe(true);
    expect(FESTIVE_EXEMPTION_MAX_DAYS).toBe(15);
  });

  it('night limits are below day limits and silence zones are the quietest', () => {
    for (const zone of NOISE_ZONES)
      expect(NOISE_LIMITS_DBA[zone].night).toBeLessThan(NOISE_LIMITS_DBA[zone].day);
    const days = NOISE_ZONES.map((zone) => NOISE_LIMITS_DBA[zone].day);
    expect(NOISE_LIMITS_DBA.silence.day).toBe(Math.min(...days));
  });
});
