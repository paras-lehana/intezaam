/**
 * Command parser for Ask (GENAI_ARCHITECTURE.md, job 5 fallback): natural-language changes in
 * English, Hinglish or Hindi become patch operations — "add 50 guests", "50 log kam karo",
 * "budget 20 lakh", "move to 12 December", "make it outdoor", "jain khana", "no alcohol",
 * "add sangeet", "haldi hata do", "date not fixed".
 *
 * Responsibility: recognise a change request (a change verb must be present, so "how many
 * guests?" is a question, not a command) and read its values with the same readers as the
 * brief: numbers by role, dates against today, setting, diet, alcohol, functions and city.
 * Relative changes ("add 50") are applied to the current context. Boundary: proposes raw
 * ops; applyAskPatch validates them.
 */
import { FUNCTION_KINDS, type FunctionKind } from '../domain/functions.js';
import type { EventContext } from '../schemas/context.js';
import type { PatchOp } from '../schemas/patch.js';
import { readNumberMentions } from './number-roles.js';
import { readDate } from './parse-dates.js';
import { readAlcohol, readCity, readDiet, readSetting } from './read-preferences.js';
import { buildPhraseIndex, findPhrases, tokenise, type Token } from './tokens.js';
import { FUNCTION_WORDS } from './vocab/events.js';
import { ALCOHOL_NO_WORDS } from './vocab/preferences.js';
import { expandGroups, phrases } from './vocab/word-list.js';

const CHANGE_WORDS = phrases(
  'add | plus | badha | badhao | increase | extra | more | zyada | remove | minus | kam | ghata | reduce | less | fewer | drop | skip | hata | hatao | hata do | make | change | move | shift | set | kar do | karo | switch | instead | chahiye | नहीं | बढ़ा | कम | हटा',
);
const ADD_WORDS = phrases('add | plus | badha | badhao | increase | extra | more | zyada | बढ़ा');
const REMOVE_WORDS = phrases(
  'remove | minus | kam | ghata | reduce | less | fewer | drop | skip | hata | hatao | hata do | कम | हटा',
);
const OPEN_DATE_WORDS = phrases(
  'date not fixed | date pakki nahi | date fix nahi | not fixed yet | flexible date',
);

const CHANGE = buildPhraseIndex(CHANGE_WORDS.map((word) => [word, true] as const));
const ADD = buildPhraseIndex(ADD_WORDS.map((word) => [word, true] as const));
const REMOVE = buildPhraseIndex(REMOVE_WORDS.map((word) => [word, true] as const));
const OPEN_DATE = buildPhraseIndex(OPEN_DATE_WORDS.map((word) => [word, true] as const));
// Declaratives that are commands without a change verb: "no alcohol", "date not fixed".
const STANDALONE = buildPhraseIndex(
  [...OPEN_DATE_WORDS, ...ALCOHOL_NO_WORDS].map((word) => [word, true] as const),
);
// All function words (wedding and others) plus the plain function names.
const FUNCTIONS = buildPhraseIndex<FunctionKind>([
  ...expandGroups(FUNCTION_WORDS),
  ...FUNCTION_KINDS.map((kind) => [kind.replace('-', ' '), kind] as const),
]);

type Direction = 'add' | 'remove' | 'set';

function direction(tokens: readonly Token[]): Direction {
  if (findPhrases(tokens, REMOVE).length > 0) return 'remove';
  return findPhrases(tokens, ADD).length > 0 ? 'add' : 'set';
}

function shifted(current: number, amount: number, way: Direction): number {
  const SHIFT: Readonly<Record<Direction, number>> = {
    add: current + amount,
    remove: current - amount,
    set: amount,
  };
  return Math.round(SHIFT[way]);
}

function numberOps(tokens: readonly Token[], context: EventContext, way: Direction): PatchOp[] {
  const mentions = readNumberMentions(tokens);
  const guests = mentions.find((mention) => mention.role === 'guests');
  const budget = mentions.find((mention) => mention.role === 'budget');
  return [
    ...(guests === undefined
      ? []
      : [{ op: 'setGuests', value: shifted(context.guests, guests.phrase.high, way) } as const]),
    ...(budget === undefined
      ? []
      : [
          {
            op: 'setBudget',
            value: shifted(context.budgetInr ?? 0, budget.phrase.low, way),
          } as const,
        ]),
  ];
}

function preferenceOps(tokens: readonly Token[], todayIso: string): PatchOp[] {
  const date = readDate(tokens, todayIso);
  const setting = readSetting(tokens);
  const menu = readDiet(tokens).menu;
  const alcohol = readAlcohol(tokens);
  const city = readCity(tokens);
  return [
    ...(date?.dateIso === undefined ? [] : [{ op: 'setDate', value: date.dateIso } as const]),
    ...(findPhrases(tokens, OPEN_DATE).length > 0
      ? [{ op: 'setDateFlexible', value: true } as const]
      : []),
    ...(setting === undefined ? [] : [{ op: 'setVenueSetting', value: setting.value } as const]),
    ...(menu === undefined ? [] : [{ op: 'setDiet', value: menu } as const]),
    ...(alcohol === undefined ? [] : [{ op: 'setAlcohol', value: alcohol.value } as const]),
    ...(city === undefined ? [] : [{ op: 'setCity', value: city.value.name } as const]),
  ];
}

function functionOps(tokens: readonly Token[], way: Direction): PatchOp[] {
  return findPhrases(tokens, FUNCTIONS).map(({ value }) =>
    way === 'remove' ? { op: 'removeFunction', value } : { op: 'addFunction', value },
  );
}

/**
 * The functions a question names ("reception", "haldi"), each once.
 * @example
 * namedFunctions(tokenise('Should we cut the reception?').tokens); // ['reception']
 */
export function namedFunctions(tokens: readonly Token[]): FunctionKind[] {
  return [...new Set(findPhrases(tokens, FUNCTIONS).map(({ value }) => value))];
}

/**
 * The patch operations a change request asks for (unvalidated); [] for a plain question.
 * @example
 * parseAskCommand('add 50 guests and move to 12 December', context, '2026-10-20');
 * // [{ op: 'setGuests', value: context.guests + 50 }, { op: 'setDate', value: '2026-12-12' }]
 */
export function parseAskCommand(
  question: string,
  context: EventContext,
  todayIso: string,
): PatchOp[] {
  const tokens = tokenise(question).tokens;
  if (findPhrases(tokens, CHANGE).length === 0 && findPhrases(tokens, STANDALONE).length === 0)
    return [];
  const way = direction(tokens);
  return [
    ...numberOps(tokens, context, way),
    ...preferenceOps(tokens, todayIso),
    ...functionOps(tokens, way),
  ];
}
