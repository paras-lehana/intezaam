/**
 * Vendor checklists (VEN-01…05) — who to book, by when, what to ask and how to pay.
 *
 * Responsibility: decide the vendors this event needs (functions, rites, officiant, tasks
 * and choices such as alcohol, open air or public premises), order them by group and by how
 * often Indian families book them, give each a book-by date (its task's due date, else its
 * lead time), its slice of the budget line (the hotel's is the priced rooms, CST-05), the
 * playbook questions plus context-specific ones, payment milestones and a Google Maps
 * search — never a named business.
 * Boundary: checklists only; payments.ts dates the milestones.
 */
import { addDaysIso } from '../domain/calendar.js';
import { CEREMONY_SEQUENCES } from '../domain/ceremonies.js';
import { CROWD_CLASS_MAX } from '../domain/crowd.js';
import { FUNCTION_PROFILES } from '../domain/functions.js';
import { gstRateForCategory } from '../domain/gst.js';
import { DAYS_PER_MONTH, monthsToDays } from '../domain/timeline.js';
import { VENDOR_PLAYBOOK } from '../domain/vendor-playbook.js';
import { VENDOR_BOOKING_SHARE_PCT, VENDOR_LEAD_MONTHS } from '../domain/vendor-timing.js';
import {
  VENDOR_GROUPS,
  VENDOR_PROFILES,
  VENDOR_TYPES,
  type VendorType,
} from '../domain/vendors.js';
import { buildMapsSearchUrl } from '../integrations/google-links.js';
import type { CostCheck, PlanBudget } from '../schemas/plan-money.js';
import type { VendorChecklist } from '../schemas/plan-people.js';
import type { PlanTask } from '../schemas/plan-time.js';
import { allocateByWeights } from './money-split.js';
import { milestonesFor } from './payments.js';
import { selectTemplates, TASK_CONDITION_CHECKS } from './task-conditions.js';
import type { TraceLog } from './trace.js';
import type { ClassifiedContext } from './types.js';

/** The playbook lists at most six questions; context adds a few; the schema allows twelve. */
const MAX_QUESTIONS = 12;
/** The lead vendor of a budget line (e.g. the caterer beside the cake) takes three parts (D). */
const PRIMARY_VENDOR_WEIGHT = 3;
/** One decimal is enough for a lead time in months. */
const MONTH_DECIMALS = 10;

/** Vendors the context itself calls for, beyond the functions and tasks. */
function contextVendors(ctx: ClassifiedContext): VendorType[] {
  const premises = ctx.input.community?.premises;
  const extras: [boolean, VendorType[]][] = [
    [ctx.input.alcohol, ['bartender']],
    [ctx.openAir, ['tent_house', 'generator']],
    [premises === 'public', ['security', 'sanitation']],
    [ctx.footfall > CROWD_CLASS_MAX.large, ['first_aid']],
    [ctx.plannerHired, ['planner']],
    // Outstation guests need rooms in every family, not only where a task books them.
    [TASK_CONDITION_CHECKS['outstation-guests'](ctx), ['hotel']],
  ];
  const officiant = ctx.family === 'wedding' ? ctx.traditionProfile?.officiant : null;
  return [...extras.flatMap(([on, types]) => (on ? types : [])), ...(officiant ? [officiant] : [])];
}

/**
 * VEN-01: the vendor types this event needs, ordered by group, then booking share, then type.
 * @example
 * neededVendors(jaipurCtx, tasks).includes('pandit'); // true
 */
export function neededVendors(ctx: ClassifiedContext, tasks: readonly PlanTask[]): VendorType[] {
  const needed = new Set<VendorType>(contextVendors(ctx));
  for (const kind of ctx.functions) FUNCTION_PROFILES[kind].vendors.forEach((v) => needed.add(v));
  if (ctx.family === 'wedding' && ctx.tradition !== null) {
    for (const step of CEREMONY_SEQUENCES[ctx.tradition]) {
      if (step.functionKind !== null && ctx.functions.includes(step.functionKind)) {
        step.vendors.forEach((v) => needed.add(v));
      }
    }
  }
  for (const task of tasks) if (task.vendorType !== undefined) needed.add(task.vendorType);
  // At home there is no hall to book; switched-off budget lines need no vendor.
  if (ctx.setting === 'home') needed.delete('venue');
  const off = ctx.input.disabledCategories;
  const rank = (v: VendorType): [number, number, number] => [
    VENDOR_GROUPS.indexOf(VENDOR_PROFILES[v].group),
    -(VENDOR_BOOKING_SHARE_PCT[v] ?? 0),
    VENDOR_TYPES.indexOf(v),
  ];
  return [...needed]
    .filter((v) => !off.includes(VENDOR_PROFILES[v].category))
    .sort((a, b) => {
      const [x, y] = [rank(a), rank(b)];
      return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
    });
}

/** The money a vendor list is sized from: the budget lines and the priced rooms. */
export interface VendorMoney {
  readonly budget: PlanBudget;
  readonly costCheck: Pick<CostCheck, 'roomsInr'>;
}

/**
 * Each vendor's slice of its budget line (the line's first vendor weighs 3, the rest 1); the
 * hotel is paid for the rooms CST-05 priced, so its milestones match the rooms bill even
 * when the guest-rooms line is short (the risk radar flags that gap).
 */
function vendorBudgets(vendors: readonly VendorType[], money: VendorMoney): Map<VendorType, number> {
  const amounts = new Map<VendorType, number>();
  for (const line of money.budget.lines) {
    const sharing = vendors.filter((v) => VENDOR_PROFILES[v].category === line.category);
    const parts = allocateByWeights(
      line.amountInr,
      sharing.map((_, i) => (i === 0 ? PRIMARY_VENDOR_WEIGHT : 1)),
    );
    sharing.forEach((v, i) => amounts.set(v, parts[i] ?? 0));
  }
  const roomsInr = money.costCheck.roomsInr;
  if (roomsInr > 0 && vendors.includes('hotel')) amounts.set('hotel', roomsInr);
  return amounts;
}

/** The longest lead in this event's own checklist: no vendor is booked before that. */
function longestLead(ctx: ClassifiedContext): number {
  return Math.max(0, ...selectTemplates(ctx).map((template) => template.leadDays));
}

interface Timing {
  readonly bookByIso: string | null;
  readonly leadMonths: number;
}

/** VEN-02: the vendor's task due date when it has one, else its lead time (capped). */
function timingFor(v: VendorType, ctx: ClassifiedContext, tasks: readonly PlanTask[]): Timing {
  const task = tasks.find(
    (candidate) => candidate.vendorType === v && candidate.dueIso !== undefined,
  );
  const leadDays = Math.min(monthsToDays(VENDOR_LEAD_MONTHS[v].months), longestLead(ctx));
  const months = Math.round((leadDays / DAYS_PER_MONTH) * MONTH_DECIMALS) / MONTH_DECIMALS;
  if (task?.dueIso !== undefined) return { bookByIso: task.dueIso, leadMonths: months };
  if (ctx.dateMode !== 'dated' || ctx.dateIso === null)
    return { bookByIso: null, leadMonths: months };
  const byLead = addDaysIso(ctx.dateIso, -leadDays) ?? ctx.todayIso;
  return { bookByIso: byLead < ctx.todayIso ? ctx.todayIso : byLead, leadMonths: months };
}

/** Questions the context adds to the playbook (diet, elders, rain). */
function extraQuestions(v: VendorType, ctx: ClassifiedContext): string[] {
  const diet = ctx.input.diet;
  const asks: [boolean, string][] = [
    [
      v === 'caterer' && (diet.menu === 'jain' || diet.jainGuests),
      'Can you serve the Jain meal before sunset, from a separate counter and utensils?',
    ],
    [
      v === 'caterer' && (diet.halal || ctx.tradition === 'muslim'),
      'Can you show a halal certificate for the meat?',
    ],
    [
      v === 'venue' && ctx.accessNeeds.includes('elderly'),
      'Can elders be seated near the stage, exits and toilets, away from the speakers?',
    ],
    [
      v === 'decorator' && ctx.rainRisk,
      'Is a waterproof hangar with raised flooring included for the rainy months?',
    ],
  ];
  return asks.filter(([on]) => on).map(([, question]) => question);
}

/**
 * Builds a checklist per needed vendor.
 * @example
 * buildVendors(jaipurCtx, { budget, costCheck }, tasks, trace)[0]?.vendorType; // 'venue'
 */
export function buildVendors(
  ctx: ClassifiedContext,
  money: VendorMoney,
  tasks: readonly PlanTask[],
  trace: TraceLog,
): VendorChecklist[] {
  const vendors = neededVendors(ctx, tasks);
  const budgets = vendorBudgets(vendors, money);
  const ids = [
    trace.add({
      ruleId: 'VEN-01',
      inputs: [
        ['functions', ctx.functions.join(', ')],
        ['tradition', ctx.tradition ?? 'none'],
        ['vendors', vendors.length],
      ],
      effect: `${vendors.length} vendor types needed, ordered by group and by how often families book them.`,
    }),
    trace.rule('VEN-02'),
    trace.rule('VEN-03'),
    trace.rule('VEN-04'),
    trace.rule('VEN-05'),
  ];
  return vendors.map((v) => {
    const profile = VENDOR_PROFILES[v];
    const playbook = VENDOR_PLAYBOOK[v];
    const timing = timingFor(v, ctx, tasks);
    const amount = budgets.get(v);
    return {
      vendorType: v,
      label: profile.label,
      group: profile.group,
      ...(timing.bookByIso === null ? {} : { bookByIso: timing.bookByIso }),
      leadMonths: timing.leadMonths,
      budgetCategory: profile.category,
      ...(amount === undefined ? {} : { budgetInr: amount }),
      gstPct: gstRateForCategory(profile.category),
      questions: [...playbook.questions, ...extraQuestions(v, ctx)].slice(0, MAX_QUESTIONS),
      getInWriting: [...playbook.getInWriting],
      redFlags: [...playbook.redFlags],
      // A vendor whose cost sits in another line (or none) has no payments of its own.
      payments: amount === undefined ? [] : milestonesFor(v, amount, timing.bookByIso, ctx),
      mapsUrl: buildMapsSearchUrl(`${profile.label} in ${ctx.cityName}`),
      status: 'to-contact',
      traceIds: ids,
    };
  });
}
