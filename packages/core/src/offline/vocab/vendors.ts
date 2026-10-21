/**
 * Vendor words for Ask: how people name each vendor type in English, Hinglish or Hindi
 * ("photographer", "halwai", "mandap wala", "पंडित").
 *
 * Responsibility: one phrase list per vendor type of the domain taxonomy (domain/vendors.ts),
 * plus that type's Hindi label, so a question that names a vendor is answered from that
 * vendor's own card. Boundary: data only; spellings separated by "|", matched as folded
 * tokens, longest first.
 */
import { VENDOR_PROFILES, VENDOR_TYPES, type VendorType } from '../../domain/vendors.js';
import type { PhraseGroups } from './word-list.js';

const VENDOR_ALIASES: Readonly<Record<VendorType, string>> = {
  venue: 'venue | hall | banquet | lawn | marriage garden | baraat ghar | mandapam',
  tent_house: 'tent | tent house | tentwala | tent wala | pandal | shamiana | hangar',
  caterer: 'caterer | catering | halwai | rasoiya',
  cake: 'cake | baker | bakery',
  bartender: 'bartender | mocktail bar | bar counter',
  decorator: 'decorator | decoration | decor | sajawat',
  florist: 'florist | flowers | phool | phoolwala | phool wala',
  sound_light: 'sound and light | sound system | speakers | lights | lighting',
  generator: 'generator | genset | backup power',
  photographer: 'photographer | photography | photos | photo | photoshoot',
  videographer: 'videographer | videography | video | cinematographer',
  makeup: 'makeup | make up | makeup artist | mua | hair',
  mehendi: 'mehendi artist | mehndi artist | mehendi wali',
  attire: 'outfit | outfits | lehenga | sherwani | saree | clothes',
  jeweller: 'jeweller | jeweler | jewellery | jewelry | gehne',
  dj_band: 'dj | band | live band',
  dhol: 'dhol | dholi | dhol wala',
  band_baaja: 'band baaja | band baja | brass band | ghodi',
  choreographer: 'choreographer | dance teacher | sangeet choreography',
  entertainer: 'entertainer | magician | anchor | emcee | performer',
  nadaswaram: 'nadaswaram | nadhaswaram | shehnai | thavil',
  pandit: 'pandit | panditji | pandit ji | priest | purohit | pujari',
  granthi: 'granthi | gurdwara',
  qazi: 'qazi | kazi | imam | maulvi',
  church_minister: 'church | minister | pastor',
  idol_maker: 'idol | murti | idol maker | murtikar',
  invitations: 'invitation | invitations | cards | invites | e-invite',
  return_gifts: 'return gift | return gifts | favours | favors',
  transport: 'transport | bus | cabs | cars | shuttle',
  hotel: 'hotel | hotel rooms | guest rooms',
  planner: 'planner | wedding planner | event planner',
  security: 'security | guards | bouncers',
  sanitation: 'sanitation | cleaning | toilets | garbage',
  first_aid: 'first aid | ambulance | doctor',
};

/**
 * Every vendor type with its spellings and Hindi label, as phrase groups.
 * @example
 * VENDOR_WORDS.find(([type]) => type === 'caterer')?.[1].includes('halwai'); // true
 */
export const VENDOR_WORDS: PhraseGroups<VendorType> = VENDOR_TYPES.map(
  (type) => [type, `${VENDOR_ALIASES[type]} | ${VENDOR_PROFILES[type].labelHi}`] as const,
);
