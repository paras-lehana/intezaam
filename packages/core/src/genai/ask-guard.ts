/**
 * Guards for GenAI job 5 (Ask and change): code decides what is refused and which changes
 * may be proposed (synthesis §5 job 5; bio-bandish assistant allow-list, 01 §3.9).
 *
 * Responsibility: `detectRefusal` refuses booking, payment, money transfers, legal advice
 * and off-scope questions before any model call (so refusal recall does not depend on the
 * model); `applyAskPatch` turns a proposed patch (from the model or the command parser)
 * into a validated ContextPatch — each op schema-checked, within the limits, meaningful
 * for this context (a function the family can have, a date in the planning window, a
 * priority that is not the cut), deduplicated and capped — or nothing.
 * Boundary: pure; the patch is applied only after the user presses Apply.
 */
import { functionAllowedFor } from '../domain/functions.js';
import type { EventContext } from '../schemas/context.js';
import { MAX_CITY_CHARS, MAX_FUNCTIONS, MAX_PATCH_OPS } from '../schemas/limits.js';
import type { REFUSAL_REASONS } from '../schemas/model-outputs.js';
import {
  contextPatchSchema,
  patchOpSchema,
  type ContextPatch,
  type PatchOp,
} from '../schemas/patch.js';
import { isWithinPlanningWindow } from '../schemas/requests.js';
import { foldForMatch } from '../security/normalise.js';
import { sanitizeUserText } from '../security/sanitize.js';

export type RefusalReason = (typeof REFUSAL_REASONS)[number];

/** Checked in this order; English, Hinglish and Hindi phrasings (folded text). */
const REFUSAL_PATTERNS: readonly (readonly [RefusalReason, readonly RegExp[]])[] = [
  [
    'booking-or-payment',
    [
      // A request for the assistant to act — "Book the caterer", "Please pay the advance" —
      // not a question about timing ("When should I book the photographer?" is planning).
      /^\W*(?:please |pls |kindly )?(?:book|pay|reserve|transfer|send money)\b(?! (?:kab|karna|karni|when))/u,
      /\b(?:can|could|will|would) you (?:please )?(?:book|pay|reserve|transfer|send|cancel|confirm)\b/u,
      /\b(?:book|pay|reserve) (?:it|this|that|them|him|her) for (?:me|us)\b|\b(?:book|pay|reserve)\b[^?]* for (?:me|us)\b/u,
      /\b(?:transfer|send) (?:money|the advance|rs|inr)\b|\b(?:confirm|cancel) (?:the |my )?booking\b/u,
      /\bbook (?:kar do|karo|kar dena)\b|\bpayment (?:kar do|karo|bhej)|\badvance (?:de do|bhej|transfer)|\bpaise bhej/u,
      /बुक (?:कर दो|कर दें|कर दीजिए|करो)|भुगतान (?:कर दो|कर दें|कर दीजिए|करो)/u,
    ],
  ],
  [
    'legal-advice',
    [
      /\b(?:legal(?:ly)?|lawyer|lawsuit|sue|court case|police case|fir|contract dispute|against the law|kanooni|kanoon)\b|कानून/u,
    ],
  ],
  [
    'off-scope',
    [/\b(?:stocks?|share price|cricket|weather forecast|horoscope|kundli|lottery|crypto)\b/u],
  ],
];

/**
 * The refusal a question needs, or undefined when it may be answered.
 * @example
 * detectRefusal('Please book the caterer and pay the advance'); // 'booking-or-payment'
 * detectRefusal('When should I book the photographer?'); // undefined
 */
export function detectRefusal(question: string): RefusalReason | undefined {
  const folded = foldForMatch(question);
  return REFUSAL_PATTERNS.find(([, patterns]) =>
    patterns.some((pattern) => pattern.test(folded)),
  )?.[0];
}

type OpCheck = (op: PatchOp, context: EventContext, todayIso: string) => boolean;

/** Whether each op is meaningful for this context (closed union: a new op is a compile error). */
const OP_CHECKS: Readonly<Record<PatchOp['op'], OpCheck>> = {
  setGuests: (op, context) => op.value !== context.guests,
  setBudget: (op, context) => op.value !== (context.budgetInr ?? null),
  setDate: (op, _context, todayIso) =>
    typeof op.value === 'string' &&
    op.value >= todayIso &&
    isWithinPlanningWindow(op.value, todayIso),
  setDateFlexible: (op, context) => op.value !== context.dateFlexible,
  setCity: (op) =>
    typeof op.value === 'string' && sanitizeUserText(op.value, MAX_CITY_CHARS) !== '',
  setVenueSetting: (op, context) => op.value !== context.venueSetting,
  setDiet: (op, context) => op.value !== context.diet.menu,
  setAlcohol: (op, context) => op.value !== context.alcohol,
  addFunction: (op, context) =>
    op.op === 'addFunction' &&
    functionAllowedFor(op.value, context.family) &&
    !context.functions.includes(op.value) &&
    context.functions.length < MAX_FUNCTIONS,
  removeFunction: (op, context) =>
    op.op === 'removeFunction' && context.functions.includes(op.value),
  toggleCategory: () => true,
  setPriority: (op, context) => op.value !== context.cut,
};

function opsOf(candidate: unknown): unknown[] {
  if (typeof candidate !== 'object' || candidate === null || !('ops' in candidate)) return [];
  return Array.isArray(candidate.ops) ? candidate.ops : [];
}

/**
 * Validates a proposed patch against the schema, the limits and the context; undefined
 * when no op survives.
 * @example
 * applyAskPatch({ ops: [{ op: 'setGuests', value: 350 }] }, context, '2026-10-20'); // { ops: [ … ] }
 * applyAskPatch({ ops: [{ op: 'setGuests', value: 99999 }] }, context, '2026-10-20'); // undefined
 */
export function applyAskPatch(
  candidate: unknown,
  context: EventContext,
  todayIso: string,
): ContextPatch | undefined {
  const seen = new Set<string>();
  const ops = opsOf(candidate).flatMap((raw) => {
    const parsed = patchOpSchema.safeParse(raw);
    if (!parsed.success) return [];
    const op = parsed.data;
    const key = `${op.op}:${JSON.stringify(op.value)}`;
    if (seen.has(key) || !OP_CHECKS[op.op](op, context, todayIso)) return [];
    seen.add(key);
    return [
      op.op === 'setCity' ? { ...op, value: sanitizeUserText(op.value, MAX_CITY_CHARS) } : op,
    ];
  });
  const patch = contextPatchSchema.safeParse({ ops: ops.slice(0, MAX_PATCH_OPS) });
  return patch.success ? patch.data : undefined;
}
