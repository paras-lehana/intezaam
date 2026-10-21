/**
 * Tests for domain/gst.ts: GST slabs, input tax credit and the per-category defaults.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { BUDGET_CATEGORIES } from '../domain/budget-categories.js';
import { isValidIsoDate } from '../domain/calendar.js';
import {
  GST_EFFECTIVE_FROM_ISO,
  GST_SERVICE_BY_CATEGORY,
  GST_SERVICE_KEYS,
  GST_SERVICES,
  gstRateForCategory,
} from '../domain/gst.js';
import { isSourceId } from '../domain/sources.js';

/** After GST 2.0 the event services in domain/gst.ts sit at 5% or 18%. */
const EVENT_SLABS = [5, 18];

describe('GST (CST-06)', () => {
  it('takes effect on 22 Sep 2025', () => {
    expect(isValidIsoDate(GST_EFFECTIVE_FROM_ISO)).toBe(true);
    expect(GST_EFFECTIVE_FROM_ISO).toBe('2025-09-22');
  });

  it('every service sits on a GST 2.0 slab and cites a source', () => {
    for (const key of GST_SERVICE_KEYS) {
      expect(EVENT_SLABS).toContain(GST_SERVICES[key].ratePct);
      expect(isSourceId(GST_SERVICES[key].sourceId)).toBe(true);
    }
  });

  it('5% services carry no input tax credit and 18% services do', () => {
    for (const key of GST_SERVICE_KEYS) {
      expect(GST_SERVICES[key].inputTaxCredit).toBe(GST_SERVICES[key].ratePct === 18);
    }
  });

  it('gives each category its service rate, or null when not researched', () => {
    for (const category of BUDGET_CATEGORIES) {
      const key = GST_SERVICE_BY_CATEGORY[category];
      expect(gstRateForCategory(category)).toBe(key === null ? null : GST_SERVICES[key].ratePct);
    }
    expect(gstRateForCategory('catering')).toBe(GST_SERVICES['outdoor-catering'].ratePct);
    expect(gstRateForCategory('transport')).toBeNull();
  });
});
