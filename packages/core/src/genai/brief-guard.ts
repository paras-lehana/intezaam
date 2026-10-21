/**
 * Evidence guard for GenAI job 1 (brief reader): the trust layer between the model's
 * reply and the planner form (synthesis §5 job 1; research note 09 §5.3).
 *
 * Responsibility: run every claimed field through the evidence checks (quote in the brief,
 * same value when code re-reads the quote, numbers and dates parsed by code), then apply
 * the cross-field rules — a kind belongs to its family, functions fit the family, a
 * tradition belongs to a wedding and is never inferred, the cut is not a priority — and
 * recompute the "understood" line and the missing core fields. Boundary: pure; it never
 * adds a field the model did not claim (the offline twin does that).
 */
import { EVENT_KIND_PROFILES } from '../domain/event-kinds.js';
import { functionAllowedFor } from '../domain/functions.js';
import { describeBrief } from '../offline/describe-brief.js';
import { CORE_BRIEF_FIELDS } from '../offline/read-brief.js';
import { readAnandKaraj, readFunctions, readTradition } from '../offline/read-event.js';
import { isHinglish } from '../offline/read-preferences.js';
import { tokenise } from '../offline/tokens.js';
import {
  BRIEF_FIELDS,
  type BriefDraft,
  type BriefField,
  type BriefModelOutput,
} from '../schemas/brief.js';
import { MAX_BRIEF_CHARS } from '../schemas/limits.js';
import { foldForMatch } from '../security/normalise.js';
import { checkCity, checkDate, checkDiet, set } from './brief-checks.js';
import { sanitizeUserText } from '../security/sanitize.js';
import { EvidenceGuard, groundedQuotes, type DropReason } from './evidence.js';
import { neutraliseDelimiters } from './prompt-boundary.js';

export interface BriefValidation {
  readonly draft: BriefDraft;
  readonly filled: BriefField[];
  readonly missing: BriefField[];
  readonly understood: string;
  /** Fields the model claimed that code could not confirm, and why (for the trace). */
  readonly dropped: { readonly field: BriefField; readonly reason: DropReason }[];
}

const DEVANAGARI = /\p{Script=Devanagari}/u;

/** Which draft keys show that a brief field was filled. */
const DRAFT_KEYS: Readonly<Record<BriefField, readonly (keyof BriefDraft)[]>> = {
  family: ['family'],
  kind: ['kind'],
  tradition: ['tradition'],
  city: ['city'],
  guests: ['guests'],
  budget: ['budgetInr'],
  date: ['dateIso', 'month', 'dateFlexible'],
  functions: ['functions'],
  venueSetting: ['venueSetting'],
  diet: ['diet'],
  alcohol: ['alcohol'],
  accessibility: ['accessibility'],
  priorities: ['priorities'],
  cut: ['cut'],
  styleTags: ['styleTags'],
  households: ['households'],
  days: ['days'],
  premises: ['premises'],
};

/** Cross-field rules: kind belongs to family, functions fit it, a tradition is a wedding's. */
function reconcile(guard: EvidenceGuard): void {
  const draft = guard.draft;
  if (draft.kind !== undefined) {
    const kindFamily = EVENT_KIND_PROFILES[draft.kind].family;
    if (draft.family === undefined) draft.family = kindFamily;
    else if (draft.family !== kindFamily) {
      delete draft.kind;
      guard.drop('kind', 'not-supported');
    }
  }
  const family = draft.family;
  if (family !== undefined && draft.functions !== undefined) {
    const fitting = draft.functions.filter((kind) => functionAllowedFor(kind, family));
    if (fitting.length > 0) draft.functions = fitting;
    else delete draft.functions;
  }
  if (draft.tradition !== undefined && family !== undefined && family !== 'wedding') {
    delete draft.tradition;
    guard.drop('tradition', 'not-supported');
  }
  if (draft.cut !== undefined && draft.priorities?.includes(draft.cut) === true) delete draft.cut;
  if (family !== 'community') {
    delete draft.households;
    delete draft.days;
    delete draft.premises;
  }
  if (draft.tradition !== 'punjabi-sikh') delete draft.anandKaraj;
}

/** Every claimed field, in form order, through its evidence check. */
function checkFields(guard: EvidenceGuard, output: BriefModelOutput): void {
  const draft = guard.draft;
  const evidenced = (field: BriefField): boolean =>
    output.evidence.some((entry) => entry.field === field);
  set(
    draft,
    'family',
    guard.confirm('family', output.family, (r) => r.family?.value),
  );
  set(
    draft,
    'kind',
    guard.confirm('kind', output.kind, (r) => r.kind?.value),
  );
  set(
    draft,
    'tradition',
    guard.confirm('tradition', output.tradition, (_r, tokens) => readTradition(tokens)?.value),
  );
  set(draft, 'city', checkCity(guard, output));
  checkDate(guard, output);
  set(
    draft,
    'guests',
    guard.number('guests', output.guestsText !== undefined || evidenced('guests')),
  );
  set(
    draft,
    'budgetInr',
    guard.number('budget', output.budgetText !== undefined || evidenced('budget')),
  );
  set(
    draft,
    'households',
    guard.number('households', output.householdsText !== undefined || evidenced('households')),
  );
  set(draft, 'days', guard.number('days', output.daysText !== undefined || evidenced('days')));
  set(
    draft,
    'premises',
    guard.confirm('premises', output.premises, (r) => r.premises?.value),
  );
  set(
    draft,
    'functions',
    guard.subset('functions', output.functions, (_r, tokens) => readFunctions(tokens).kinds),
  );
  set(
    draft,
    'venueSetting',
    guard.confirm('venueSetting', output.venueSetting, (r) => r.venueSetting?.value),
  );
  checkDiet(guard, output);
  set(
    draft,
    'alcohol',
    guard.confirm('alcohol', output.alcohol, (r) => r.alcohol?.value),
  );
  set(
    draft,
    'accessibility',
    guard.subset('accessibility', output.accessibility, (r) => r.accessibility?.value),
  );
  set(
    draft,
    'priorities',
    guard.subset('priorities', output.priorities, (r) => r.priorities?.value),
  );
  set(
    draft,
    'cut',
    guard.confirm('cut', output.cut, (r) => r.cut?.value),
  );
  set(
    draft,
    'styleTags',
    guard.subset('styleTags', output.styleTags, (r) => r.styleTags?.value),
  );
}

/**
 * Validates a brief reply (from the model or the offline twin) against the brief and today.
 * @example
 * const reply = readBriefOffline('2 lakh mein 200 log, Jaipur', '2026-10-20');
 * validateBriefDraft(reply, '2 lakh mein 200 log, Jaipur', '2026-10-20').draft.budgetInr; // 200000
 */
export function validateBriefDraft(
  output: BriefModelOutput,
  text: string,
  todayIso: string,
): BriefValidation {
  const seen = sanitizeUserText(text, MAX_BRIEF_CHARS);
  // The haystack is the neutralised text the model saw: a quote from a stripped line fails.
  const haystack = foldForMatch(neutraliseDelimiters(seen));
  const guard = new EvidenceGuard(groundedQuotes(output, haystack), todayIso);
  checkFields(guard, output);
  const devanagari = DEVANAGARI.test(seen);
  guard.draft.language = devanagari ? 'hi' : 'en';
  if (!devanagari && isHinglish(tokenise(seen).tokens)) guard.draft.hinglish = true;
  // Code reads the brief itself: only "Sikh", "Anand Karaj" or "gurdwara" make it one (09 §5.2).
  if (guard.draft.tradition === 'punjabi-sikh') {
    guard.draft.anandKaraj = readAnandKaraj(tokenise(seen).tokens) !== undefined;
  }
  reconcile(guard);
  const draft = guard.draft;
  const filled = BRIEF_FIELDS.filter((field) =>
    DRAFT_KEYS[field].some((key) => draft[key] !== undefined),
  );
  return {
    draft,
    filled,
    missing: CORE_BRIEF_FIELDS.filter((field) => !filled.includes(field)),
    understood: describeBrief(draft),
    dropped: guard.dropped,
  };
}
