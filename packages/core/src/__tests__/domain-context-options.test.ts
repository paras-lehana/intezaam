/**
 * Tests for domain/context-options.ts: form option labels and open-air settings.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import {
  HELP_LEVEL_LABELS,
  HELP_LEVELS,
  OPEN_AIR_SETTINGS,
  PREMISES,
  PREMISES_LABELS,
  VENUE_SETTING_LABELS,
  VENUE_SETTINGS,
} from '../domain/context-options.js';

describe('form options', () => {
  it('every option is labelled', () => {
    for (const setting of VENUE_SETTINGS)
      expect(VENUE_SETTING_LABELS[setting].length).toBeGreaterThan(0);
    for (const level of HELP_LEVELS) expect(HELP_LEVEL_LABELS[level].length).toBeGreaterThan(0);
    for (const premises of PREMISES) expect(PREMISES_LABELS[premises].length).toBeGreaterThan(0);
  });

  it('open-air settings are outdoor and mixed, never an indoor hall or a home', () => {
    expect([...OPEN_AIR_SETTINGS]).toEqual(['outdoor', 'mixed']);
    for (const setting of OPEN_AIR_SETTINGS) expect(VENUE_SETTINGS).toContain(setting);
  });
});
