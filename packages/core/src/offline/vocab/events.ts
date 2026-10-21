/**
 * Event vocabulary for the offline brief reader (research note 09 §5.2.3, bio-bandish
 * `_FAMILY_WORDS` and `_TYPE_WORDS`, research note 01 §3.1 and §3.11).
 *
 * Responsibility: the explicit words that name an event family and kind ("shaadi", "mundan",
 * "griha pravesh", "satsang"), the functions of a wedding ("mehendi", "pheras"), the words
 * that make a celebration a community one ("society", "RWA", "mandal") and the ambiguous
 * "saalgirah". Boundary: data only; explicit statements only — nothing is inferred from
 * names, surnames or the city.
 */
import type { EventFamily, EventKind } from '../../domain/events.js';
import type { FunctionKind } from '../../domain/functions.js';
import { phrases, type PhraseGroups } from './word-list.js';

/** Words that name a wedding (family words; regional spellings are ours, grade D). */
export const WEDDING_WORDS = phrases(
  'shaadi | shadi | शादी | vivah | विवाह | byah | biyah | marriage | wedding | nikah | निकाह | anand karaj | church wedding | court marriage | registered marriage | biye | lagna | lagan | kalyanam | pelli | viah | baraat | pheras | walima',
);

/** Family-function kinds (bio-bandish `_FAMILY_WORDS`, 01 §3.1). */
export const FAMILY_FUNCTION_WORDS: PhraseGroups<EventKind> = [
  ['engagement', 'roka | sagai | सगाई | engagement | ring ceremony | tilak | mangni'],
  ['naming-mundan', 'mundan | मुंडन | namkaran | नामकरण | naming ceremony | naming'],
  ['griha-pravesh', 'griha pravesh | गृह प्रवेश | housewarming | house warming | grih pravesh'],
  ['baby-shower', 'godh bharai | गोद भराई | baby shower | seemantham | valaikappu'],
  ['anniversary', 'anniversary | shaadi ki saalgirah | wedding anniversary'],
  ['retirement', 'retirement | सेवानिवृत्ति'],
  [
    'home-puja',
    'puja | pooja | पूजा | havan | हवन | katha | कथा | path | पाठ | home puja | griha puja',
  ],
];

/** Birthday words; the kind comes from the age, "teen", "1st" or Shashtiabdapurti. */
export const BIRTHDAY_WORDS = phrases(
  "birthday | bday | b'day | janamdin | janmdin | जन्मदिन | happy birthday",
);
export const TEEN_BIRTHDAY_PHRASES = phrases('teen birthday | teenage birthday');
export const SIXTIETH_WORDS = phrases(
  'shashtiabdapurti | shashtyabdapurti | shashtipoorthi | sashtiapthapoorthi | shashti poorthi | shashtiabdapoorthi | षष्ठीपूर्ति | षष्टिपूर्ति | षष्ट्यब्दपूर्ति | manivizha | 60th birthday',
);

/** "saalgirah" is a birthday or an anniversary: the form asks (battery B33). */
export const AMBIGUOUS_ANNIVERSARY_WORDS = phrases('saalgirah | सालगिरह');

/** Community markers: a festival word plus one of these is a community event. */
export const COMMUNITY_WORDS = phrases('mandal | sabha | committee');

/**
 * Residential markers: also community markers, and they make a festival a society festival
 * (inside a housing society) rather than a public pandal (09 §5.5).
 */
export const RESIDENTIAL_WORDS = phrases(
  'society | सोसाइटी | rwa | apartment | flat association | colony | housing society | our building | residents',
);

/** Where a community event happens: the society's own compound, or public land (PERM-04). */
export const PRIVATE_PREMISES_WORDS = phrases(
  'compound | clubhouse | club house | campus | podium | terrace | inside the society | society premises | society ground',
);
export const PUBLIC_PREMISES_WORDS = phrases(
  'public ground | public park | maidan | मैदान | main road | on the road | street | chowk | सड़क',
);

/** Only these make a Punjabi or Sikh wedding an Anand Karaj; "Punjabi" alone does not (09 §5.2). */
export const ANAND_KARAJ_WORDS = phrases(
  'sikh | सिख | anand karaj | anand kaaraj | gurdwara | gurudwara | गुरुद्वारा | laavan | lavan',
);

/** Community kinds named directly (gatherings and drives have no festival). */
export const COMMUNITY_KIND_WORDS: PhraseGroups<EventKind> = [
  [
    'religious-gathering',
    'satsang | सत्संग | jagran | जागरण | bhandara | भंडारा | kirtan | langar',
  ],
  ['charity-fundraiser', 'charity | fundraiser | fund raiser | donation drive'],
  [
    'rwa-function',
    'cultural night | cultural programme | cultural program | sports day | annual day',
  ],
  ['festival-pandal', 'pandal | पंडाल'],
];

/** A "get-together" or "milan" is a family function without a fixed kind (01 §3.1). */
export const GET_TOGETHER_WORDS = phrases('get together | get-together | milan | reunion');

/** Wedding functions in the order a brief lists them (01 §3.11 `_TYPE_WORDS`). */
export const FUNCTION_WORDS: PhraseGroups<FunctionKind> = [
  ['roka', 'roka | रोका'],
  ['engagement', 'engagement | sagai | ring ceremony | सगाई'],
  ['haldi', 'haldi | हल्दी | mayun | pithi | ubtan | gaye holud'],
  ['mehendi', 'mehendi | mehndi | मेहंदी | henna'],
  ['sangeet', 'sangeet | संगीत | jaggo | cocktail'],
  ['wedding', 'pheras | phere | फेरे | wedding ceremony | anand karaj | lagan | nikah'],
  ['reception', 'reception | रिसेप्शन | walima | bou bhat'],
];

/** The bare family word "wedding/shaadi" becomes the wedding function only beside others. */
export const WEDDING_FUNCTION_FALLBACK_WORDS = phrases('wedding | shaadi | शादी | vivah');

/** Family assumed when a function is named without a family word (mehendi → wedding). */
export const FAMILY_OF_FUNCTION: Readonly<Partial<Record<FunctionKind, EventFamily>>> = {
  haldi: 'wedding',
  mehendi: 'wedding',
  sangeet: 'wedding',
  wedding: 'wedding',
  reception: 'wedding',
};
