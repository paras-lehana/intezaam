/**
 * Vendor types — who a celebration needs to book.
 *
 * Responsibility: the merged, India-first vendor taxonomy (03 §5, 04 §4 vendor keys), the
 * group each vendor sits in, and the budget category its cost lands in. Boundary:
 * taxonomy only; lead times are in vendor-timing.ts and checklists in vendor-playbook-*.ts.
 * No vendor names: discovery is a map search the user runs (VEN-05).
 */
import type { BudgetCategory } from './budget-categories.js';

export const VENDOR_TYPES = [
  'venue',
  'tent_house',
  'caterer',
  'cake',
  'bartender',
  'decorator',
  'florist',
  'sound_light',
  'generator',
  'photographer',
  'videographer',
  'makeup',
  'mehendi',
  'attire',
  'jeweller',
  'dj_band',
  'dhol',
  'band_baaja',
  'choreographer',
  'entertainer',
  'nadaswaram',
  'pandit',
  'granthi',
  'qazi',
  'church_minister',
  'idol_maker',
  'invitations',
  'return_gifts',
  'transport',
  'hotel',
  'planner',
  'security',
  'sanitation',
  'first_aid',
] as const;

export type VendorType = (typeof VENDOR_TYPES)[number];

/** Groups from the merged taxonomy (03 §5), used to order and fold the vendor list. */
export const VENDOR_GROUPS = [
  'venue',
  'food',
  'decor',
  'capture',
  'look',
  'experience',
  'ritual',
  'paper-gifts',
  'logistics',
  'community',
] as const;

export type VendorGroup = (typeof VENDOR_GROUPS)[number];

export const VENDOR_GROUP_LABELS: Readonly<Record<VendorGroup, string>> = {
  venue: 'Venue',
  food: 'Food',
  decor: 'Decor, light and sound',
  capture: 'Photo and video',
  look: 'Outfits and looks',
  experience: 'Music and entertainment',
  ritual: 'Rituals',
  'paper-gifts': 'Invitations and gifts',
  logistics: 'Travel, stay and planning',
  community: 'Safety and services',
};

export interface VendorProfile {
  readonly label: string;
  readonly labelHi: string;
  readonly group: VendorGroup;
  /** The budget line this vendor is paid from (and its default GST, gst.ts). */
  readonly category: BudgetCategory;
}

export const VENDOR_PROFILES: Readonly<Record<VendorType, VendorProfile>> = {
  venue: { label: 'Venue', labelHi: 'वेन्यू', group: 'venue', category: 'venue' },
  tent_house: {
    label: 'Tent house and pandal',
    labelHi: 'टेंट हाउस',
    group: 'venue',
    category: 'venue',
  },
  caterer: { label: 'Caterer', labelHi: 'कैटरर', group: 'food', category: 'catering' },
  cake: { label: 'Cake', labelHi: 'केक', group: 'food', category: 'catering' },
  bartender: { label: 'Bar and mocktails', labelHi: 'बार', group: 'food', category: 'catering' },
  decorator: { label: 'Decorator', labelHi: 'डेकोरेटर', group: 'decor', category: 'decor' },
  florist: { label: 'Florist', labelHi: 'फूलवाला', group: 'decor', category: 'decor' },
  sound_light: {
    label: 'Sound and light',
    labelHi: 'साउंड और लाइट',
    group: 'decor',
    category: 'sound_light',
  },
  generator: { label: 'Generator', labelHi: 'जनरेटर', group: 'logistics', category: 'sound_light' },
  photographer: {
    label: 'Photographer',
    labelHi: 'फ़ोटोग्राफ़र',
    group: 'capture',
    category: 'photo_video',
  },
  videographer: {
    label: 'Videographer',
    labelHi: 'वीडियोग्राफ़र',
    group: 'capture',
    category: 'photo_video',
  },
  makeup: {
    label: 'Makeup and hair',
    labelHi: 'मेकअप आर्टिस्ट',
    group: 'look',
    category: 'makeup',
  },
  mehendi: {
    label: 'Mehendi artist',
    labelHi: 'मेहंदी आर्टिस्ट',
    group: 'look',
    category: 'mehendi',
  },
  attire: { label: 'Outfits', labelHi: 'पहनावा', group: 'look', category: 'attire' },
  jeweller: { label: 'Jeweller', labelHi: 'ज्वैलर', group: 'look', category: 'jewellery' },
  dj_band: {
    label: 'DJ or band',
    labelHi: 'डीजे या बैंड',
    group: 'experience',
    category: 'entertainment',
  },
  dhol: { label: 'Dhol', labelHi: 'ढोल', group: 'experience', category: 'entertainment' },
  band_baaja: {
    label: 'Baraat band, baaja and ghodi',
    labelHi: 'बैंड-बाजा और घोड़ी',
    group: 'experience',
    category: 'entertainment',
  },
  choreographer: {
    label: 'Choreographer',
    labelHi: 'कोरियोग्राफ़र',
    group: 'experience',
    category: 'entertainment',
  },
  entertainer: {
    label: 'Performers and entertainers',
    labelHi: 'कलाकार',
    group: 'experience',
    category: 'entertainment',
  },
  nadaswaram: {
    label: 'Nadaswaram and shehnai',
    labelHi: 'नादस्वरम और शहनाई',
    group: 'experience',
    category: 'entertainment',
  },
  pandit: { label: 'Pandit or priest', labelHi: 'पंडित', group: 'ritual', category: 'rituals' },
  granthi: {
    label: 'Gurdwara and granthi',
    labelHi: 'गुरुद्वारा',
    group: 'ritual',
    category: 'rituals',
  },
  qazi: { label: 'Qazi or imam', labelHi: 'क़ाज़ी', group: 'ritual', category: 'rituals' },
  church_minister: {
    label: 'Church and minister',
    labelHi: 'चर्च और पादरी',
    group: 'ritual',
    category: 'rituals',
  },
  idol_maker: { label: 'Idol maker', labelHi: 'मूर्तिकार', group: 'ritual', category: 'rituals' },
  invitations: {
    label: 'Invitations',
    labelHi: 'निमंत्रण पत्र',
    group: 'paper-gifts',
    category: 'invites',
  },
  return_gifts: {
    label: 'Return gifts and favours',
    labelHi: 'रिटर्न गिफ्ट',
    group: 'paper-gifts',
    category: 'gifts',
  },
  transport: {
    label: 'Guest transport',
    labelHi: 'यातायात',
    group: 'logistics',
    category: 'transport',
  },
  hotel: { label: 'Hotel rooms', labelHi: 'होटल', group: 'logistics', category: 'accommodation' },
  planner: { label: 'Planner', labelHi: 'प्लानर', group: 'logistics', category: 'planner' },
  security: {
    label: 'Security',
    labelHi: 'सुरक्षा',
    group: 'community',
    category: 'safety_medical',
  },
  sanitation: {
    label: 'Sanitation and waste',
    labelHi: 'सफ़ाई',
    group: 'community',
    category: 'volunteers_sanitation',
  },
  first_aid: {
    label: 'First aid and ambulance',
    labelHi: 'प्राथमिक चिकित्सा',
    group: 'community',
    category: 'safety_medical',
  },
};

/** The officiant each faith's ceremony needs (VEN-01: ceremony vendors by tradition). */
export const OFFICIANT_VENDORS: readonly VendorType[] = [
  'pandit',
  'granthi',
  'qazi',
  'church_minister',
];
