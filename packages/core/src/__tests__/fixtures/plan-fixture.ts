/**
 * A complete, valid Plan assembled from domain tables (for schema tests).
 *
 * Responsibility: compose the fixture sections into one Plan whose every value is
 * derived from the domain tables and the Jaipur sample context. Boundary: test support
 * only; it is not a planner and makes no planning decisions.
 */
import { PER_PLATE_INR } from '../../domain/catering.js';
import { DIET_RULES } from '../../domain/diet.js';
import { FOOD_GRAMS_PER_ADULT } from '../../domain/food.js';
import { FUNCTION_PROFILES } from '../../domain/functions.js';
import { GST_EFFECTIVE_FROM_ISO, gstRateForCategory } from '../../domain/gst.js';
import {
  ATTENDANCE_IN_TOWN,
  COOK_FOR_FACTOR,
  GUESTS_PER_ROOM,
  PLATE_GUARANTEE_FACTOR,
  WASTE_WARNING_FACTOR,
} from '../../domain/headcount.js';
import { LEVERS } from '../../domain/levers.js';
import { RULES } from '../../domain/rules.js';
import { SPACE_LAYOUT_PROFILES } from '../../domain/space.js';
import { templatesForFamily } from '../../domain/tasks.js';
import { PAYMENT_CHECKLIST, VENDOR_PLAYBOOK } from '../../domain/vendor-playbook.js';
import { VENDOR_LEAD_MONTHS } from '../../domain/vendor-timing.js';
import { VENDOR_PROFILES } from '../../domain/vendors.js';
import { allInFactor } from '../../engine/catering.js';
import { buildMapsSearchUrl } from '../../integrations/google-links.js';
import { READINESS_FACTORS } from '../../schemas/plan-money.js';
import type { Plan } from '../../schemas/plan.js';
import {
  amountOf,
  FIXTURE_TODAY,
  fixtureBudgetLines,
  fixtureContext,
  fixtureContextEcho,
  fixtureSafety,
  fixtureSources,
  fixtureTrace,
  PERCENT,
  venueMilestones,
} from './plan-parts.js';

/** Builds the fixture plan; every number is arithmetic on table values. */
export function buildFixturePlan(): Plan {
  const context = fixtureContext();
  const totalInr = context.budgetInr ?? 0;
  const trace = fixtureTrace();
  const traceIds = trace.map((item) => item.id);
  const lines = fixtureBudgetLines(totalInr, traceIds);
  const expected = Math.round(context.guests * ATTENDANCE_IN_TOWN.value);
  const outstation = Math.round(context.guests * context.outstationShare);
  const plate = PER_PLATE_INR.tier2.veg;
  const cateringLine = amountOf(lines, 'catering');
  const cateringMid = Math.round((expected * (plate.min + plate.max)) / 2);
  const milestones = venueMilestones(amountOf(lines, 'venue'));
  const venue = VENDOR_PROFILES.venue;
  return {
    todayIso: FIXTURE_TODAY,
    title: context.title ?? 'Plan',
    contextEcho: fixtureContextEcho(context, totalInr),
    verdict: {
      money: { status: 'lean', reason: RULES['VER-M'].summary, traceIds },
      time: { status: 'compressed', reason: RULES['VER-T'].summary, traceIds },
      headline: RULES['VER-M'].title,
      estimateInr: { low: totalInr, mid: totalInr, high: totalInr },
    },
    readiness: {
      score: 0,
      factors: READINESS_FACTORS.map((key) => ({
        key,
        label: key,
        points: 0,
        max: PERCENT / READINESS_FACTORS.length,
      })),
      traceIds,
    },
    budget: {
      totalInr,
      source: 'user',
      jewelleryInr: 0,
      contingencyInr: amountOf(lines, 'contingency'),
      perGuestInr: Math.round(totalInr / context.guests),
      lines,
      byFunction: context.functions.map((functionKind) => ({
        functionKind,
        label: FUNCTION_PROFILES[functionKind].label,
        guests: Math.round(context.guests * FUNCTION_PROFILES[functionKind].guestShare),
        amountInr: 0,
        perGuestInr: 0,
        lines: [],
        traceIds,
      })),
      traceIds,
    },
    costCheck: {
      perPlateInr: { min: plate.min, max: plate.max },
      plates: expected,
      // CST-02 + CST-06 at the standard caterer the tier-2 plate band prices: service, then GST once.
      taxesServicePct: (allInFactor('standard') - 1) * PERCENT,
      cateringInr: { low: expected * plate.min, mid: cateringMid, high: expected * plate.max },
      roomsInr: 0,
      cateringLineInr: cateringLine,
      gapInr: cateringLine - cateringMid,
      status: cateringLine >= cateringMid ? 'covered' : 'short',
      notes: [],
      traceIds,
    },
    gst: {
      effectiveFromIso: GST_EFFECTIVE_FROM_ISO,
      totalInr: 0,
      note: 'Depends on the contract.',
      lines: lines.map((line) => ({ category: line.category, ratePct: line.gstPct, gstInr: 0 })),
      traceIds,
    },
    levers: [
      {
        id: 'fewer-guests',
        ruleId: LEVERS['fewer-guests'].ruleId,
        title: LEVERS['fewer-guests'].label,
        detail: RULES['LEV-01'].summary,
        savingInr: 0,
        newMoneyStatus: 'balanced',
        patch: { ops: [{ op: 'setGuests', value: expected }] },
        traceIds,
      },
    ],
    payments: {
      milestones,
      cashflow: [],
      assumption: true,
      checklist: [...PAYMENT_CHECKLIST],
      traceIds,
    },
    headcount: {
      invited: context.guests,
      expected,
      attendanceRate: ATTENDANCE_IN_TOWN.value,
      plateGuarantee: Math.round(expected * PLATE_GUARANTEE_FACTOR),
      cookFor: Math.round(expected * COOK_FOR_FACTOR),
      wasteWarningAbove: Math.round(expected * WASTE_WARNING_FACTOR),
      outstationGuests: outstation,
      rooms: Math.ceil(outstation / GUESTS_PER_ROOM),
      traceIds,
    },
    food: {
      gramsPerAdult: { min: FOOD_GRAMS_PER_ADULT.min, max: FOOD_GRAMS_PER_ADULT.max },
      totalKg: { min: 0, max: 0 },
      counters: ['veg', 'jain'],
      rules: [{ key: 'jain', title: DIET_RULES.jain.title, items: [...DIET_RULES.jain.items] }],
      traceIds,
    },
    space: {
      layout: 'reception-mixed',
      sqftPerGuest: SPACE_LAYOUT_PROFILES['reception-mixed'].defaultSqftPerGuest,
      status: 'unknown',
      traceIds,
    },
    timeline: {
      mode: 'dated',
      compressed: true,
      daysToEvent: null,
      tasks: templatesForFamily('wedding')
        .slice(0, 3)
        .map((template) => ({
          id: template.id,
          templateId: template.id,
          phase: template.phase,
          title: template.title,
          why: template.why,
          leadDays: template.leadDays,
          status: 'urgent' as const,
          core: template.core,
          dependsOn: [...template.dependsOn],
          traceIds,
        })),
      dateNotes: [],
      traceIds,
    },
    functions: [],
    runSheet: [],
    vendors: [
      {
        vendorType: 'venue',
        label: venue.label,
        group: venue.group,
        leadMonths: VENDOR_LEAD_MONTHS.venue.months,
        budgetCategory: venue.category,
        budgetInr: amountOf(lines, 'venue'),
        gstPct: gstRateForCategory('venue'),
        questions: [...VENDOR_PLAYBOOK.venue.questions],
        getInWriting: [...VENDOR_PLAYBOOK.venue.getInWriting],
        redFlags: [...VENDOR_PLAYBOOK.venue.redFlags],
        payments: milestones,
        mapsUrl: buildMapsSearchUrl(`${venue.label} in ${context.city}`),
        status: 'to-contact',
        traceIds,
      },
    ],
    ...fixtureSafety(context, traceIds),
    trace,
    sources: fixtureSources(),
  };
}
