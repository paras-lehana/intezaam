/**
 * Community occasions in v1: thirteen data rows on top of the five
 * activity-shaped community kinds.
 *
 * Responsibility: for each occasion, the community kind it plans as (pandal, society
 * celebration, religious gathering, cultural night or charity drive), how its date is found,
 * what is specific to it and the rules and sources behind that. RWAs organise "religious
 * festivals, national holidays and other community activities" (S-ADDA-2024), so the list
 * spans faiths and civic days, and the picker groups it by activity, not by religion.
 * Boundary: data only. Muhurat, Chaturmas and Kharmas never apply to an occasion (CTX-08);
 * an occasion adds no new engine logic — its kind does the planning.
 */
import type { EventKind } from './events.js';
import type { FestivalId } from './festivals.js';
import type { RuleId } from './rule-ids.js';
import type { SourceId } from './sources.js';
import type { Confidence } from './source-types.js';

export const COMMUNITY_OCCASIONS = [
  'ganesh-utsav',
  'durga-puja',
  'navratri-garba',
  'diwali-mela',
  'holi-milan',
  'eid-milan',
  'christmas',
  'gurpurab',
  'onam',
  'national-day',
  'sports-day',
  'religious-gathering',
  'charity-drive',
] as const;

export type CommunityOccasion = (typeof COMMUNITY_OCCASIONS)[number];

/** How an occasion's date is found: a curated festival row, a fixed day, or the committee's pick. */
export type OccasionDates =
  | { readonly basis: 'festival'; readonly festivalIds: readonly FestivalId[] }
  /** Eid Milan follows either Eid, and the day depends on the moon sighting. */
  | { readonly basis: 'after-festival'; readonly festivalIds: readonly FestivalId[] }
  /** Gregorian month-day pairs ("08-15"), the same every year. */
  | { readonly basis: 'fixed'; readonly monthDays: readonly string[] }
  | { readonly basis: 'user-picks' };

export interface OccasionProfile {
  readonly label: string;
  readonly labelHi: string;
  /** The community kind the engine plans this occasion as. */
  readonly kind: EventKind;
  readonly dates: OccasionDates;
  /** What is specific to this occasion, in one line. */
  readonly highlight: string;
  readonly ruleIds: readonly RuleId[];
  readonly sourceIds: readonly SourceId[];
  readonly confidence: Confidence;
}

const PANDAL: EventKind = 'festival-pandal';
const SOCIETY: EventKind = 'society-festival';
const GATHERING: EventKind = 'religious-gathering';
const CULTURAL: EventKind = 'rwa-function';

export const COMMUNITY_OCCASION_PROFILES: Readonly<Record<CommunityOccasion, OccasionProfile>> = {
  'ganesh-utsav': {
    label: 'Ganesh utsav',
    labelHi: 'गणेश उत्सव',
    kind: PANDAL,
    dates: { basis: 'festival', festivalIds: ['ganesh-chaturthi-2027'] },
    highlight: 'Pandal permission first; the procession and immersion need their own permission.',
    ruleIds: ['TL-10', 'PERM-04', 'PERM-05'],
    sourceIds: ['S-BMC-2026', 'S-IMMERSION-2026'],
    confidence: 'B',
  },
  // Durga Puja 2027 is 6–9 Oct, ending at Dussehra (Drik Panchang via the festival row's name).
  'durga-puja': {
    label: 'Durga Puja',
    labelHi: 'दुर्गा पूजा',
    kind: PANDAL,
    dates: { basis: 'festival', festivalIds: ['dussehra-2026', 'dussehra-2027'] },
    highlight: 'West Bengal takes pandal permissions through one online form; plan separate exits.',
    ruleIds: ['PERM-04', 'PERM-06'],
    sourceIds: ['S-SAHAJ-2026', 'S-THEPRINT-2026'],
    confidence: 'B',
  },
  // Sharad Navratri ends the day before Dussehra (30 Sep–8 Oct in 2027), so it is dated from it.
  'navratri-garba': {
    label: 'Navratri garba and dandiya',
    labelHi: 'नवरात्रि गरबा-डांडिया',
    kind: SOCIETY,
    dates: { basis: 'festival', festivalIds: ['dussehra-2026', 'dussehra-2027'] },
    highlight: 'Amplified music outdoors stops at 10 pm unless the state grants a festival night.',
    ruleIds: ['PERM-02'],
    sourceIds: ['S-NOISE-RULE5-ND'],
    confidence: 'A',
  },
  'diwali-mela': {
    label: 'Diwali mela',
    labelHi: 'दिवाली मेला',
    kind: SOCIETY,
    dates: { basis: 'festival', festivalIds: ['diwali-2026', 'diwali-2027'] },
    highlight: "Crackers only in the court's time slot; green crackers only in Delhi-NCR.",
    ruleIds: ['PERM-07'],
    sourceIds: ['S-SCCONLINE-2018'],
    confidence: 'A',
  },
  'holi-milan': {
    label: 'Holi milan',
    labelHi: 'होली मिलन',
    kind: SOCIETY,
    dates: { basis: 'festival', festivalIds: ['holi-2027'] },
    highlight: 'Sources differ on the 2027 date (22 or 23 March): confirm it locally.',
    ruleIds: ['DATE-05'],
    sourceIds: ['S-DOPT-2027', 'S-DRIK-2027'],
    confidence: 'B',
  },
  'eid-milan': {
    label: 'Eid Milan',
    labelHi: 'ईद मिलन',
    kind: SOCIETY,
    dates: { basis: 'after-festival', festivalIds: ['eid-al-fitr-2027', 'eid-al-adha-2027'] },
    highlight: 'The day follows the moon sighting; ask about the menu and whether food is halal.',
    ruleIds: ['CTX-08', 'DIET-02'],
    sourceIds: ['S-DOPT-2027', 'S-WIKI-HALAL'],
    confidence: 'B',
  },
  christmas: {
    label: 'Christmas celebration',
    labelHi: 'क्रिसमस समारोह',
    kind: CULTURAL,
    dates: { basis: 'festival', festivalIds: ['christmas-2026', 'christmas-2027'] },
    highlight: 'Carols and a party; the 10 pm outdoor sound limit still applies.',
    ruleIds: ['PERM-02'],
    sourceIds: ['S-DOPT-2026', 'S-NOISE-RULE5-ND'],
    confidence: 'A',
  },
  gurpurab: {
    label: 'Gurpurab',
    labelHi: 'गुरुपर्व',
    kind: GATHERING,
    dates: { basis: 'festival', festivalIds: ['gurpurab-2026', 'gurpurab-2027'] },
    highlight:
      'Langar raises the food share; a nagar kirtan on the street needs procession permission.',
    ruleIds: ['PERM-05', 'DIET-04'],
    sourceIds: ['S-DOPT-2026', 'S-DOPT-2027', 'S-IMMERSION-2026'],
    confidence: 'B',
  },
  onam: {
    label: 'Onam',
    labelHi: 'ओणम',
    kind: SOCIETY,
    dates: { basis: 'festival', festivalIds: ['onam-2027'] },
    highlight:
      'Sadya served on plantain leaves and a pookalam flower carpet; celebrated across faiths.',
    ruleIds: ['DATE-05'],
    sourceIds: ['S-WIKI-ONAM', 'S-DRIK-2027'],
    confidence: 'B',
  },
  'national-day': {
    label: 'Independence Day or Republic Day',
    labelHi: 'स्वतंत्रता दिवस या गणतंत्र दिवस',
    kind: CULTURAL,
    dates: { basis: 'fixed', monthDays: ['08-15', '01-26'] },
    highlight:
      'Flag hoisting: machine-made and polyester flags are allowed, and may fly day and night.',
    ruleIds: [],
    sourceIds: ['S-FLAG-CODE-2022', 'S-DOPT-2027'],
    confidence: 'C',
  },
  'sports-day': {
    label: 'Society sports day',
    labelHi: 'सोसाइटी खेल दिवस',
    kind: CULTURAL,
    dates: { basis: 'user-picks' },
    highlight: 'Outdoors, so the rain check applies; keep first aid and crowd basics ready.',
    ruleIds: ['CTX-07', 'CROWD-01'],
    sourceIds: ['S-ADDA-2024', 'S-NDMA-2014'],
    confidence: 'C',
  },
  'religious-gathering': {
    label: 'Satsang, jagran or bhandara',
    labelHi: 'सत्संग, जागरण या भंडारा',
    kind: GATHERING,
    dates: { basis: 'user-picks' },
    highlight: 'Loudspeakers need written permission, and outdoor sound stops at 10 pm.',
    ruleIds: ['PERM-01', 'PERM-02'],
    sourceIds: ['S-NOISE-RULE5-ND'],
    confidence: 'A',
  },
  // 80G/12A tax status for donations was not researched, so it is not claimed.
  'charity-drive': {
    label: 'Charity or fundraiser',
    labelHi: 'चैरिटी या धन संग्रह',
    kind: 'charity-fundraiser',
    dates: { basis: 'user-picks' },
    highlight: 'Keep accounts for contributors; tax benefits for donors are not covered here.',
    ruleIds: ['TL-11'],
    sourceIds: ['S-ADDA-2024'],
    confidence: 'C',
  },
};

/**
 * The community kind an occasion plans as.
 * @example
 * occasionKind('ganesh-utsav'); // 'festival-pandal'
 */
export function occasionKind(occasion: CommunityOccasion): EventKind {
  return COMMUNITY_OCCASION_PROFILES[occasion].kind;
}
