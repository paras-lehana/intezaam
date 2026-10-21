/**
 * City gazetteer — about 70 Indian cities mapped to tier, state, anchor and rainy months.
 *
 * Responsibility: turn whatever the user typed ("Bombay", "Gurgaon", "bengaluru ") into a
 * known city. Tiers for Mumbai, Delhi NCR, Bengaluru, Hyderabad, Lucknow, Pune, Ahmedabad
 * and Kolkata follow the per-plate source's lists (grade C); every other tier is our
 * mapping (grade D, the user can override it). Rainy months are per city (CTX-07): the
 * state's monsoon pattern unless the row names its own (WET_PATTERN_INFO in seasons.ts).
 * Boundary: lookup only; an unknown city is the caller's to handle (UNKNOWN_CITY_TIER).
 */
import type { AnchorCity, CityTier } from './cities.js';
import { NE_MONSOON_STATES, WET_PATTERN_INFO, type WetPattern } from './seasons.js';

export interface CityInfo {
  readonly id: string;
  readonly name: string;
  readonly state: string;
  readonly tier: CityTier;
  /** C when the per-plate source lists the city in that tier; D for our own mapping. */
  readonly tierConfidence: 'C' | 'D';
  readonly anchor: AnchorCity | null;
  readonly aliases: readonly string[];
  /** The city's rain pattern; its sources and grade are in WET_PATTERN_INFO. */
  readonly wetPattern: WetPattern;
  /** Months (1–12) when an open-air event is rain-risk (CTX-07). */
  readonly rainyMonths: readonly number[];
}

interface RowOptions {
  readonly aliases?: readonly string[];
  readonly anchor?: AnchorCity;
  readonly sourcedTier?: boolean;
  /** Overrides the state's pattern (Bengaluru's own data; South Interior Karnataka). */
  readonly wet?: WetPattern;
}

function city(
  id: string,
  name: string,
  state: string,
  tier: CityTier,
  options: RowOptions = {},
): CityInfo {
  const wetPattern =
    options.wet ?? (NE_MONSOON_STATES.includes(state) ? 'southwest-and-northeast' : 'southwest');
  return {
    id,
    name,
    state,
    tier,
    tierConfidence: options.sourcedTier === true ? 'C' : 'D',
    anchor: options.anchor ?? null,
    aliases: options.aliases ?? [],
    wetPattern,
    rainyMonths: WET_PATTERN_INFO[wetPattern].months,
  };
}

const NCR = { anchor: 'delhi-ncr', sourcedTier: true } as const;

export const CITY_TABLE: readonly CityInfo[] = [
  city('mumbai', 'Mumbai', 'Maharashtra', 'metro', {
    aliases: ['bombay'],
    anchor: 'mumbai',
    sourcedTier: true,
  }),
  city('delhi', 'Delhi', 'Delhi', 'metro', { ...NCR, aliases: ['new delhi', 'delhi ncr', 'ncr'] }),
  city('gurugram', 'Gurugram', 'Haryana', 'metro', { ...NCR, aliases: ['gurgaon'] }),
  city('noida', 'Noida', 'Uttar Pradesh', 'metro', { ...NCR, aliases: ['greater noida'] }),
  city('ghaziabad', 'Ghaziabad', 'Uttar Pradesh', 'metro', NCR),
  city('faridabad', 'Faridabad', 'Haryana', 'metro', NCR),
  city('bengaluru', 'Bengaluru', 'Karnataka', 'metro', {
    aliases: ['bangalore'],
    anchor: 'bengaluru',
    sourcedTier: true,
    wet: 'bengaluru',
  }),
  city('hyderabad', 'Hyderabad', 'Telangana', 'metro', {
    aliases: ['secunderabad'],
    anchor: 'hyderabad',
    sourcedTier: true,
  }),
  city('chennai', 'Chennai', 'Tamil Nadu', 'metro', { aliases: ['madras'], anchor: 'chennai' }),
  city('navi-mumbai', 'Navi Mumbai', 'Maharashtra', 'metro'),
  city('thane', 'Thane', 'Maharashtra', 'metro'),
  city('kolkata', 'Kolkata', 'West Bengal', 'tier2', {
    aliases: ['calcutta'],
    anchor: 'kolkata',
    sourcedTier: true,
  }),
  city('pune', 'Pune', 'Maharashtra', 'tier2', { aliases: ['poona'], sourcedTier: true }),
  city('ahmedabad', 'Ahmedabad', 'Gujarat', 'tier2', { anchor: 'ahmedabad', sourcedTier: true }),
  city('lucknow', 'Lucknow', 'Uttar Pradesh', 'tier2', { sourcedTier: true }),
  city('jaipur', 'Jaipur', 'Rajasthan', 'tier2', { anchor: 'jaipur' }),
  city('surat', 'Surat', 'Gujarat', 'tier2'),
  city('vadodara', 'Vadodara', 'Gujarat', 'tier2', { aliases: ['baroda'] }),
  city('rajkot', 'Rajkot', 'Gujarat', 'tier2'),
  city('indore', 'Indore', 'Madhya Pradesh', 'tier2'),
  city('bhopal', 'Bhopal', 'Madhya Pradesh', 'tier2'),
  city('nagpur', 'Nagpur', 'Maharashtra', 'tier2'),
  city('nashik', 'Nashik', 'Maharashtra', 'tier2'),
  city('chandigarh', 'Chandigarh', 'Chandigarh', 'tier2', { aliases: ['tricity'] }),
  city('ludhiana', 'Ludhiana', 'Punjab', 'tier2'),
  city('amritsar', 'Amritsar', 'Punjab', 'tier2'),
  city('kochi', 'Kochi', 'Kerala', 'tier2', { aliases: ['cochin', 'ernakulam'] }),
  city('thiruvananthapuram', 'Thiruvananthapuram', 'Kerala', 'tier2', { aliases: ['trivandrum'] }),
  city('coimbatore', 'Coimbatore', 'Tamil Nadu', 'tier2'),
  city('madurai', 'Madurai', 'Tamil Nadu', 'tier2'),
  city('visakhapatnam', 'Visakhapatnam', 'Andhra Pradesh', 'tier2', { aliases: ['vizag'] }),
  city('vijayawada', 'Vijayawada', 'Andhra Pradesh', 'tier2'),
  city('bhubaneswar', 'Bhubaneswar', 'Odisha', 'tier2'),
  city('patna', 'Patna', 'Bihar', 'tier2'),
  city('guwahati', 'Guwahati', 'Assam', 'tier2'),
  city('kanpur', 'Kanpur', 'Uttar Pradesh', 'tier2'),
  city('agra', 'Agra', 'Uttar Pradesh', 'tier2'),
  city('varanasi', 'Varanasi', 'Uttar Pradesh', 'tier2', {
    aliases: ['banaras', 'benares', 'kashi'],
  }),
  city('dehradun', 'Dehradun', 'Uttarakhand', 'tier2'),
  // South Interior Karnataka is a northeast-monsoon subdivision (S-IMD-NEM-2026).
  city('mysuru', 'Mysuru', 'Karnataka', 'tier2', {
    aliases: ['mysore'],
    wet: 'southwest-and-northeast',
  }),
  city('mangaluru', 'Mangaluru', 'Karnataka', 'tier2', { aliases: ['mangalore'] }),
  city('goa', 'Goa', 'Goa', 'tier2', { aliases: ['panaji', 'panjim'] }),
  city('udaipur', 'Udaipur', 'Rajasthan', 'tier2'),
  city('raipur', 'Raipur', 'Chhattisgarh', 'tier2'),
  city('ranchi', 'Ranchi', 'Jharkhand', 'tier2'),
  city('jodhpur', 'Jodhpur', 'Rajasthan', 'tier3'),
  city('ajmer', 'Ajmer', 'Rajasthan', 'tier3'),
  city('bikaner', 'Bikaner', 'Rajasthan', 'tier3'),
  city('meerut', 'Meerut', 'Uttar Pradesh', 'tier3'),
  city('prayagraj', 'Prayagraj', 'Uttar Pradesh', 'tier3', { aliases: ['allahabad'] }),
  city('bareilly', 'Bareilly', 'Uttar Pradesh', 'tier3'),
  city('gorakhpur', 'Gorakhpur', 'Uttar Pradesh', 'tier3'),
  city('gwalior', 'Gwalior', 'Madhya Pradesh', 'tier3'),
  city('jabalpur', 'Jabalpur', 'Madhya Pradesh', 'tier3'),
  city('aurangabad', 'Chhatrapati Sambhajinagar', 'Maharashtra', 'tier3', {
    aliases: ['aurangabad'],
  }),
  city('kolhapur', 'Kolhapur', 'Maharashtra', 'tier3'),
  city('hubballi', 'Hubballi', 'Karnataka', 'tier3', { aliases: ['hubli', 'dharwad'] }),
  city('tiruchirappalli', 'Tiruchirappalli', 'Tamil Nadu', 'tier3', { aliases: ['trichy'] }),
  city('puducherry', 'Puducherry', 'Puducherry', 'tier3', { aliases: ['pondicherry', 'pondy'] }),
  city('kozhikode', 'Kozhikode', 'Kerala', 'tier3', { aliases: ['calicut'] }),
  city('jamshedpur', 'Jamshedpur', 'Jharkhand', 'tier3'),
  city('cuttack', 'Cuttack', 'Odisha', 'tier3'),
  city('siliguri', 'Siliguri', 'West Bengal', 'tier3'),
  city('durgapur', 'Durgapur', 'West Bengal', 'tier3'),
  city('jalandhar', 'Jalandhar', 'Punjab', 'tier3'),
  city('shimla', 'Shimla', 'Himachal Pradesh', 'tier3'),
  city('jammu', 'Jammu', 'Jammu and Kashmir', 'tier3'),
  city('srinagar', 'Srinagar', 'Jammu and Kashmir', 'tier3'),
  city('rishikesh', 'Rishikesh', 'Uttarakhand', 'tier3'),
];

/**
 * Lower-cases, strips accents and punctuation and collapses spaces, so "  New-Delhi " and
 * "new delhi" match the same entry.
 * @example
 * normaliseCityName('  Bengaluru, KA '); // 'bengaluru ka'
 */
export function normaliseCityName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Efficiency: one Map built at load gives O(1) lookups for every keystroke-driven re-plan.
const CITY_INDEX: ReadonlyMap<string, CityInfo> = new Map(
  CITY_TABLE.flatMap((entry) =>
    [entry.id, entry.name, ...entry.aliases].map((key) => [normaliseCityName(key), entry] as const),
  ),
);

/**
 * Finds a city by name, alias or id; undefined when it is not in the gazetteer.
 * A trailing state ("Pune, Maharashtra") is ignored.
 * @example
 * findCity('Bombay')?.id; // 'mumbai'
 * findCity('Atlantis'); // undefined
 */
export function findCity(name: string): CityInfo | undefined {
  const [head = ''] = name.split(',');
  return CITY_INDEX.get(normaliseCityName(name)) ?? CITY_INDEX.get(normaliseCityName(head));
}
