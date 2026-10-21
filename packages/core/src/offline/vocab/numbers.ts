/**
 * Number vocabulary for the offline brief reader (research note 09 §5.2.1).
 *
 * Responsibility: the words a brief uses for numbers and for what a number counts — Hindi,
 * Hinglish and English cardinals, the sau/hazaar/lakh/crore multipliers (with lac, L, k, cr),
 * the fraction words sava/paune/saade/dedh/dhai, ordinals, approximation and cap words, and
 * the nouns that give a number its role (people, households, days, money, per plate, time).
 * Sources: Hindustani numerals and Lakh (Wikipedia, grade B), UNC "A Door Into Hindi" lesson
 * 14 and Awal Madaan 2025 for the fraction grammar (B/C); other spellings are ours (D).
 * Boundary: data only, written in natural spelling; the parser folds every entry once at load.
 */
import { phrases, words, type WordGroups } from './word-list.js';

/** Cardinals; a word number counts only before a multiplier or a unit noun (09 §5.2.1). */
export const CARDINAL_WORDS: WordGroups<number> = [
  [1, 'ek एक one'],
  [2, 'do दो two'],
  [3, 'teen तीन three'],
  [4, 'char chaar चार four'],
  [5, 'paanch panch पांच पाँच five'],
  [6, 'chhe chhah छह छः six'],
  [7, 'saat सात seven'],
  [8, 'aath आठ eight'],
  [9, 'nau नौ nine'],
  [10, 'das दस ten'],
  [11, 'gyarah ग्यारह eleven'],
  [12, 'barah बारह twelve'],
  [13, 'terah तेरह thirteen'],
  [14, 'chaudah चौदह fourteen'],
  [15, 'pandrah पंद्रह fifteen'],
  [16, 'solah सोलह sixteen'],
  [17, 'satrah सत्रह seventeen'],
  [18, 'atharah अठारह eighteen'],
  [19, 'unnees उन्नीस nineteen'],
  [20, 'bees बीस twenty'],
  [25, 'pachees पच्चीस'],
  [30, 'tees तीस thirty'],
  [40, 'chalees चालीस forty'],
  [50, 'pachaas pachas पचास fifty'],
  [60, 'saath साठ sixty'],
  [70, 'sattar सत्तर seventy'],
  [80, 'assi अस्सी eighty'],
  [90, 'nabbe navve नब्बे ninety'],
];

/** sau ×100 · hazaar/k ×1,000 · lakh/lac/L ×1,00,000 · crore/cr ×1,00,00,000 (Lakh, Wikipedia). */
export const MULTIPLIER_WORDS: WordGroups<number> = [
  [100, 'sau सौ hundred'],
  [1_000, 'hazaar hazar hajar हज़ार thousand k'],
  [100_000, 'lakh lakhs lac lacs laakh l लाख'],
  [10_000_000, 'crore crores cr karod करोड़'],
];

/** The smallest multiplier that makes a number money on its own (rule 8: k, hazaar, lakh, crore). */
export const MONEY_MULTIPLIER_MIN = 1_000;

/**
 * fixed = the word is the number (dedh 1½) · plus/minus = applied to the cardinal that follows
 * (saade teen 3½, paune do 1¾) · alone-or-plus = sava: one and a quarter alone, cardinal + ¼
 * before one (sava do lakh = 2,25,000).
 */
export type FractionKind = 'fixed' | 'plus' | 'minus' | 'alone-or-plus';

export interface FractionRule {
  readonly kind: FractionKind;
  readonly value: number;
}

export const FRACTION_WORDS: WordGroups<FractionRule> = [
  [{ kind: 'alone-or-plus', value: 0.25 }, 'sava sawa savaa सवा'],
  [{ kind: 'minus', value: 0.25 }, 'paune pone पौने'],
  [{ kind: 'plus', value: 0.5 }, 'saade sade saadhe sadhe साढ़े'],
  [{ kind: 'fixed', value: 1.5 }, 'dedh derh डेढ़'],
  [{ kind: 'fixed', value: 2.5 }, 'dhai dhaai adhai ढाई अढ़ाई'],
  [{ kind: 'fixed', value: 0.5 }, 'aadha आधा'],
  [{ kind: 'fixed', value: 0.25 }, 'paav पाव'],
];

/** Hindi and English ordinals (a birthday child's age): pehla … dasvaan, two spellings each (D). */
export const ORDINAL_WORDS: WordGroups<number> = [
  [1, 'pehla pahla पहला first'],
  [2, 'doosra dusra दूसरा second'],
  [3, 'teesra tisra तीसरा third'],
  [4, 'chautha चौथा fourth'],
  [5, 'paanchvaan panchva पांचवां fifth'],
  [6, 'chhatha छठा sixth'],
  [7, 'saatvaan satva सातवां seventh'],
  [8, 'aathvaan aathva आठवां eighth'],
  [9, 'nauvaan नौवां ninth'],
  [10, 'dasvaan dasva दसवां tenth'],
];

/** "7th", "1st", "22nd", "3rd" after a number make it an age (or years for an anniversary). */
export const ORDINAL_SUFFIXES = words('th st nd rd');

/** Before a number: approximately; "+" after it means the same ("100+"). */
export const APPROX_WORDS = words(
  'lagbhag लगभग takriban kareeb करीब around about approx approximately roughly nearly ~',
);
export const APPROX_AFTER_WORDS = words('+');

/** Cap words: "tak" after a number, "upto/max/within/under" before it, "se upar nahi" after. */
export const CAP_AFTER_WORDS = words('tak तक');
export const CAP_BEFORE_WORDS = words('upto max maximum within under');
export const CAP_AFTER_PHRASES = phrases('se upar nahi | se zyada nahi | se jyada nahi');

/** Money markers up to two tokens before a number (rule 8). */
export const CURRENCY_WORDS = words(
  '₹ rs inr rupaye rupees rupee रुपये budget बजट fund फंड pool chanda',
);

/** People nouns: a number before one is a guest count; several are summed (rule 4). */
export const PEOPLE_NOUNS = words(
  'log logon लोग लोगों guests guest mehmaan mehman मेहमान pax people persons residents members sangat janta bachche बच्चे kids children parents adults friends dost',
);

/** Household nouns: households, never guests (rule 5). */
export const HOUSEHOLD_NOUNS = words('flats फ्लैट households ghar घर families parivar परिवार');

/** Day nouns: programme length in days (rule 6). */
export const DAY_NOUNS = words('din दिन day days nights');

/** Phrases after which a number is a per-plate price, never the budget (rule 7). */
export const PER_PLATE_PHRASES = phrases('per plate | per head | prati plate | thali | per guest');

/** Time markers ("11 baje", "7 pm"); "raat" before 7–11 adds twelve hours (rule 1). */
export const TIME_SUFFIXES = words('baje बजे am pm');
export const NIGHT_WORDS = words('raat रात');

/** Range joiners: "100-120", "100 to 120", "100 se 120". */
export const RANGE_WORDS = words('- to se से');
