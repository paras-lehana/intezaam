/**
 * Tests that copy quoting a domain figure reads it from its table: rule summaries, vendor
 * playbook questions, permission text and the birthday return-gift task.
 *
 * Responsibility: pin that each sentence carries the value its table holds, so changing a
 * table changes the words a family reads. Boundary: expected text is built with the same
 * helpers (`rangeText`, `bpAsPercent`, `factorAsPercent`) from the tables under test.
 */
import { describe, expect, it } from 'vitest';
import {
  JEWELLERY_SHARE_OF_TOTAL,
  OUTSTATION_ACCOMMODATION_BP,
  PLANNER_SHARE_BP,
} from '../domain/budget-shifts.js';
import {
  GUESTS_PER_SERVER,
  OUTSIDE_CATERER_ROYALTY_INR,
  SERVICE_CHARGE_PCT,
} from '../domain/catering.js';
import { KIDS_PARTY_ITEMS_INR, LATE_RETURN_GIFT_MARKUP_PCT } from '../domain/costs.js';
import { GST_SERVICES } from '../domain/gst.js';
import {
  COOK_FOR_FACTOR,
  PARENTS_MISSING_RSVPS_PCT,
  PLATE_GUARANTEE_FACTOR,
  RETURN_GIFT_BUFFER_PCT,
  WASTE_WARNING_FACTOR,
  WEDDING_FOOD_WASTE_PCT,
} from '../domain/headcount.js';
import {
  FESTIVE_EXEMPTION_MAX_DAYS,
  LOUDSPEAKER_ABOVE_AMBIENT_DBA,
  LOUDSPEAKER_BOUNDARY_MAX_DBA,
  NOISE_LIMITS_DBA,
  PERMISSIONS,
  SILENCE_ZONE_RADIUS_M,
} from '../domain/permissions.js';
import { RULES } from '../domain/rules.js';
import { TASK_TEMPLATES } from '../domain/tasks.js';
import { bpAsPercent, factorAsPercent, range, rangeText } from '../domain/units.js';
import { OBSERVED_ADVANCE_PCT, VENDOR_PLAYBOOK } from '../domain/vendor-playbook.js';

const percentRange = (band: Parameters<typeof rangeText>[0]): string => `${rangeText(band)}%`;

describe('quoting helpers', () => {
  it('read a factor and a basis-point range as the percentages copy prints', () => {
    expect(factorAsPercent(PLATE_GUARANTEE_FACTOR)).toBe(Math.round(PLATE_GUARANTEE_FACTOR * 100));
    expect(bpAsPercent(range(800, 1_000))).toEqual(range(8, 10));
  });
});

describe('rule summaries quote their tables', () => {
  it('budget shifts (BUD-04, BUD-06)', () => {
    expect(RULES['BUD-04'].summary).toContain(
      percentRange(bpAsPercent(OUTSTATION_ACCOMMODATION_BP)),
    );
    expect(RULES['BUD-06'].summary).toContain(`${factorAsPercent(JEWELLERY_SHARE_OF_TOTAL)}%`);
    expect(RULES['BUD-06'].summary).toContain(percentRange(bpAsPercent(PLANNER_SHARE_BP)));
  });

  it('headcount (HC-02, HC-03) and payments (VEN-04)', () => {
    const plates = RULES['HC-02'].summary;
    for (const factor of [PLATE_GUARANTEE_FACTOR, COOK_FOR_FACTOR, WASTE_WARNING_FACTOR]) {
      expect(plates).toContain(`${factorAsPercent(factor)}%`);
    }
    expect(plates).toContain(percentRange(WEDDING_FOOD_WASTE_PCT));
    expect(RULES['HC-03'].summary).toContain(percentRange(RETURN_GIFT_BUFFER_PCT));
    expect(RULES['HC-03'].summary).toContain(`${PARENTS_MISSING_RSVPS_PCT}%`);
    expect(RULES['VEN-04'].summary).toContain(percentRange(OBSERVED_ADVANCE_PCT));
  });

  it('noise rules (PERM-01…03)', () => {
    expect(RULES['PERM-01'].summary).toContain(`${LOUDSPEAKER_ABOVE_AMBIENT_DBA} dB(A)`);
    expect(RULES['PERM-01'].summary).toContain(`${LOUDSPEAKER_BOUNDARY_MAX_DBA} dB(A)`);
    expect(RULES['PERM-02'].summary).toContain(`${FESTIVE_EXEMPTION_MAX_DAYS} days`);
    expect(RULES['PERM-03'].summary).toContain(`${SILENCE_ZONE_RADIUS_M} m`);
    expect(RULES['PERM-03'].summary).toContain(`${NOISE_LIMITS_DBA.silence.night} dB at night`);
    expect(PERMISSIONS.loudspeaker.timing).toContain(`${LOUDSPEAKER_BOUNDARY_MAX_DBA} dB(A)`);
    expect(PERMISSIONS['night-sound'].timing).toContain(`${FESTIVE_EXEMPTION_MAX_DAYS} days`);
  });
});

describe('vendor playbook questions quote their tables (VEN-03)', () => {
  it('venue royalty, servers, the caterer service charge and catering GST', () => {
    const venue = VENDOR_PLAYBOOK.venue.questions.join(' ');
    const caterer = VENDOR_PLAYBOOK.caterer.questions.join(' ');
    expect(venue).toContain(`₹${rangeText(OUTSIDE_CATERER_ROYALTY_INR)}`);
    expect(caterer).toContain(rangeText(GUESTS_PER_SERVER.buffet));
    expect(caterer).toContain(rangeText(GUESTS_PER_SERVER.plated));
    expect(caterer).toContain(`${SERVICE_CHARGE_PCT.standard}–${SERVICE_CHARGE_PCT.premium}%`);
    expect(caterer).toContain(`${GST_SERVICES['outdoor-catering'].ratePct}% GST`);
  });

  it('the planner fee share', () => {
    const planner = VENDOR_PLAYBOOK.planner.questions.join(' ');
    expect(planner).toContain(percentRange(bpAsPercent(PLANNER_SHARE_BP)));
  });
});

describe('birthday tasks quote their tables', () => {
  it('the return-gift task carries the buffer and the late-buying markup', () => {
    const gifts = TASK_TEMPLATES.find((template) => template.id === 'b-return-gifts');
    expect(gifts?.title).toContain(percentRange(RETURN_GIFT_BUFFER_PCT));
    expect(gifts?.why).toContain(percentRange(LATE_RETURN_GIFT_MARKUP_PCT));
    expect(gifts?.fallbackTitle).toContain(percentRange(LATE_RETURN_GIFT_MARKUP_PCT));
  });

  it('the photographer task carries the party photographer price', () => {
    const photo = TASK_TEMPLATES.find((template) => template.id === 'b-book-photographer');
    expect(photo?.why).toContain(`₹${rangeText(KIDS_PARTY_ITEMS_INR.photographer)}`);
  });
});
