/**
 * Plan fixture parts: the trace, budget lines, payments, context echo and safety items.
 *
 * Responsibility: build each plan section from the domain tables, the engine's trace log and
 * a sample context so schema tests never pin numbers an engine would compute. Boundary: test support only.
 */
import { ACCESSIBILITY_ITEMS, accessItemsFor } from '../../domain/accessibility.js';
import { BUDGET_CATEGORIES, CATEGORY_PROFILES } from '../../domain/budget-categories.js';
import { BASIS_POINTS_TOTAL, BUDGET_SPLITS } from '../../domain/budget-splits.js';
import { daysBetweenIso } from '../../domain/calendar.js';
import { CROWD_CHECKS, crowdClassFor } from '../../domain/crowd.js';
import { gstRateForCategory } from '../../domain/gst.js';
import { PERMISSIONS, VERIFY_LOCALLY_NOTE } from '../../domain/permissions.js';
import type { RuleId } from '../../domain/rule-ids.js';
import { RULES } from '../../domain/rules.js';
import { sampleContext } from '../../domain/samples.js';
import { type SourceId, sourceRef } from '../../domain/sources.js';
import { DEFAULT_PAYMENT_SCHEDULE } from '../../domain/vendor-playbook.js';
import { createTraceLog } from '../../engine/trace.js';
import type { EventContext } from '../../schemas/context.js';
import type { BudgetLine, PaymentMilestone } from '../../schemas/plan-money.js';
import type { Plan } from '../../schemas/plan.js';
import type { SourceRef, TraceItem } from '../../schemas/trace.js';

export const FIXTURE_TODAY = '2026-10-20';
export const PERCENT = 100;
const FIXTURE_RULES: readonly RuleId[] = ['BUD-01', 'VER-M', 'VER-T', 'TL-01', 'PERM-02'];

export function fixtureContext(): EventContext {
  return sampleContext('jaipur-wedding', FIXTURE_TODAY);
}

/** One item per fixture rule, written by the engine's own trace log (ids, grade, assumption). */
export function fixtureTrace(): TraceItem[] {
  const log = createTraceLog();
  for (const ruleId of FIXTURE_RULES) {
    log.add({ ruleId, inputs: [['rule', ruleId]], effect: RULES[ruleId].summary });
  }
  return log.items();
}

/** Every source the fixture's rules cite, once each. */
export function fixtureSources(): SourceRef[] {
  const ids = new Set<SourceId>(FIXTURE_RULES.flatMap((ruleId) => RULES[ruleId].sourceIds));
  return [...ids].map((id) => sourceRef(id));
}

export function fixtureBudgetLines(totalInr: number, traceIds: string[]): BudgetLine[] {
  const shares = BUDGET_SPLITS.wedding.shares;
  return BUDGET_CATEGORIES.flatMap((category) => {
    const shareBp = shares[category];
    if (shareBp === undefined) return [];
    const profile = CATEGORY_PROFILES[category];
    return [
      {
        category,
        label: profile.label,
        amountInr: Math.floor((totalInr * shareBp) / BASIS_POINTS_TOTAL),
        shareBp,
        costType: profile.costType,
        gstPct: gstRateForCategory(category),
        priority: false,
        traceIds,
      },
    ];
  });
}

export function amountOf(lines: readonly BudgetLine[], category: BudgetLine['category']): number {
  return lines.find((line) => line.category === category)?.amountInr ?? 0;
}

export function venueMilestones(venueInr: number): PaymentMilestone[] {
  return DEFAULT_PAYMENT_SCHEDULE.map((milestone) => ({
    vendorType: 'venue',
    key: milestone.key,
    label: milestone.label,
    pct: milestone.pct,
    amountInr: Math.round((venueInr * milestone.pct) / PERCENT),
    due: milestone.due,
  }));
}

export function fixtureContextEcho(context: EventContext, totalInr: number): Plan['contextEcho'] {
  const daysToEvent =
    context.dateIso === undefined ? undefined : daysBetweenIso(FIXTURE_TODAY, context.dateIso);
  return {
    family: context.family,
    kind: context.kind,
    cityName: context.city,
    tier: 'tier2',
    tierSource: 'gazetteer',
    anchor: 'jaipur',
    scale: 'mid',
    ...(context.dateIso === undefined ? {} : { dateIso: context.dateIso }),
    daysToEvent: daysToEvent ?? null,
    season: { peak: true, offPeak: false, weekday: false, month: null, pauses: [] },
    rainRisk: false,
    crowdClass: crowdClassFor(context.guests),
    setting: context.venueSetting,
    guests: context.guests,
    functions: [...context.functions],
    budgetInr: totalInr,
    budgetSource: 'user',
    budgetPerGuestInr: Math.round(totalInr / context.guests),
    language: context.language,
  };
}

type SafetySections = Pick<Plan, 'permissions' | 'crowd' | 'risks' | 'accessibility'>;

export function fixtureSafety(context: EventContext, traceIds: string[]): SafetySections {
  const nightSound = PERMISSIONS['night-sound'];
  return {
    permissions: [
      {
        id: 'night-sound',
        ruleId: nightSound.ruleId,
        title: nightSound.title,
        authority: nightSound.authority,
        when: nightSound.appliesWhen,
        required: true,
        blocker: true,
        note: VERIFY_LOCALLY_NOTE,
        sourceIds: [...nightSound.sourceIds],
        traceIds,
      },
    ],
    crowd: {
      footfall: context.guests,
      crowdClass: crowdClassFor(context.guests),
      checks: [{ id: 'exits', ruleId: CROWD_CHECKS.exits.ruleId, title: CROWD_CHECKS.exits.title }],
      traceIds,
    },
    risks: [
      {
        id: 'risk-night-sound',
        ruleId: nightSound.ruleId,
        severity: 'blocker',
        title: nightSound.title,
        detail: nightSound.appliesWhen,
        fix: nightSound.timing,
        traceIds,
      },
    ],
    accessibility: {
      needs: ['elderly'],
      items: accessItemsFor(['elderly']).map((id) => ({
        id,
        ruleId: ACCESSIBILITY_ITEMS[id].ruleId,
        title: ACCESSIBILITY_ITEMS[id].title,
        detail: ACCESSIBILITY_ITEMS[id].detail,
      })),
      traceIds,
    },
  };
}
