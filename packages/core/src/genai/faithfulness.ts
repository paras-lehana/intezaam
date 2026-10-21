/**
 * Faithfulness guard for GenAI job 2 (and the number check jobs 4 and 5 reuse): every number
 * the model writes must already exist in the numbered plan facts (synthesis §5; the fifa
 * eval pattern, 06 §4 row 10).
 *
 * Responsibility: read the numbers in model text with the same number grammar the brief
 * reader uses ("₹25 L", "25 lakh" and "₹25,00,000" are all 25,00,000), compare them with the
 * numbers the model was shown (facts, citable trace items and tasks), and replace any
 * unfaithful sentence — or one written in another
 * language's script — with the code's template sentence; drop reasons and actions whose ids
 * are not in the plan. Ideas are checked by the idea guard. Boundary: pure; never edits a
 * number, only swaps in trusted text.
 */
import type { LanguageCode } from '../domain/languages.js';
import { readNumberPhrases } from '../offline/number-phrases.js';
import { actionTemplate, reasonTemplate } from '../offline/narrate.js';
import { tokenise } from '../offline/tokens.js';
import type { PlanFact } from '../schemas/diff.js';
import { PALETTE_WORDS, type NarrationModelOutput } from '../schemas/model-outputs.js';
import type { Plan } from '../schemas/plan.js';
import { narrationPlanBlock } from './prompts-narration.js';
import { matchesLanguageScript } from './script-check.js';

const DIGITS = /\d/;

/** Phrase values ("2 lakh" → 200000; a range gives both ends), plus the digits written when asked. */
function valuesIn(text: string, withDigits: boolean): number[] {
  const tokens = tokenise(text).tokens;
  const values = readNumberPhrases(tokens).flatMap((phrase) => {
    const words = tokens.slice(phrase.start, phrase.end + 1).map((token) => token.text);
    const digits = words.filter((word) => DIGITS.test(word)).map(Number);
    // Bare number words ("two days") are not checked: only digits and multiplied phrases.
    if (digits.length === 0 && phrase.multiplier === 1) return [];
    return withDigits ? [...digits, phrase.low, phrase.high] : [phrase.low, phrase.high];
  });
  return [...new Set(values.filter(Number.isFinite))];
}

/**
 * The numeric values a text states, each once: digit numbers and multiplied phrases ("₹25 L"
 * and "25 lakh" are both 2500000; a range gives both ends). Bare number words without a
 * multiplier are not counted.
 * @example
 * numbersIn('Budget ₹25 L for 300 guests'); // [2500000, 300]
 */
export function numbersIn(text: string): number[] {
  return valuesIn(text, false);
}

/**
 * The numbers a trusted text allows a reply to use: its values plus the digits as written,
 * so a fact "₹25 L" also allows "25".
 * @example
 * numbersAllowedBy('Total ₹25 L').has(25); // true
 */
export function numbersAllowedBy(text: string): ReadonlySet<number> {
  return new Set(valuesIn(text, true));
}

/**
 * The set of numbers the facts contain (the only numbers a reply may use).
 * @example
 * factNumbers([{ id: 'F1', section: 'budget', text: 'Total ₹25,00,000' }]).has(2500000); // true
 */
export function factNumbers(facts: readonly PlanFact[]): ReadonlySet<number> {
  return numbersAllowedBy(facts.map((fact) => fact.text).join('\n'));
}

/**
 * True when every number in the text is one of the allowed numbers.
 * @example
 * isFaithful('About ₹30 L', new Set([2500000])); // false
 */
export function isFaithful(text: string, allowed: ReadonlySet<number>): boolean {
  return numbersIn(text).every((value) => allowed.has(value));
}

export interface FaithfulnessResult {
  readonly narration: NarrationModelOutput;
  /** Which parts were swapped or dropped, e.g. "summary", "reason:t-3", "action:w-12". */
  readonly replaced: string[];
}

/**
 * Checks a narration against the plan, its facts and the chosen language; unfaithful or
 * wrong-script text becomes the template. `fallback` is the offline narration of the same
 * plan (headline and summary templates).
 * @example
 * checkNarrationFaithfulness(reply, plan, facts, narrateOffline(plan, context), 'en').replaced; // ['summary']
 */
export function checkNarrationFaithfulness(
  output: NarrationModelOutput,
  plan: Plan,
  facts: readonly PlanFact[],
  fallback: NarrationModelOutput,
  language: LanguageCode,
): FaithfulnessResult {
  // The model may use any number it was shown: the facts, the citable trace items and tasks.
  const allowed = numbersAllowedBy(narrationPlanBlock(plan, facts));
  const replaced: string[] = [];
  const trusted = (part: string, text: string, template: string): string => {
    if (isFaithful(text, allowed) && matchesLanguageScript(text, language)) return text;
    replaced.push(part);
    return template;
  };
  const traceById = new Map(plan.trace.map((item) => [item.id, item]));
  const taskById = new Map(plan.timeline.tasks.map((task) => [task.id, task]));
  const reasons = output.reasons.flatMap((reason) => {
    const item = traceById.get(reason.traceId);
    if (item !== undefined) {
      return [{ ...reason, text: trusted(`reason:${item.id}`, reason.text, reasonTemplate(item)) }];
    }
    replaced.push(`reason:${reason.traceId}`);
    return [];
  });
  const actions = output.actions.flatMap((action) => {
    const task = taskById.get(action.taskId);
    if (task !== undefined) {
      return [{ ...action, text: trusted(`action:${task.id}`, action.text, actionTemplate(task)) }];
    }
    replaced.push(`action:${action.taskId}`);
    return [];
  });
  // Code keeps the first three palette words the board shows; a theme name with a number is dropped.
  const themes = output.themes
    ?.filter((theme) => numbersIn(theme.name).length === 0)
    .map((theme) => ({ ...theme, paletteWords: theme.paletteWords.slice(0, PALETTE_WORDS) }));
  return {
    narration: {
      headline: trusted('headline', output.headline, fallback.headline),
      summary: trusted('summary', output.summary, fallback.summary),
      reasons,
      actions,
      ideas: output.ideas,
      ...(themes === undefined ? {} : { themes }),
    },
    replaced,
  };
}
