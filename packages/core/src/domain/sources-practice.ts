/**
 * Source register, part 5: practical rules of thumb and our own stated assumptions.
 *
 * Responsibility: the sources behind headcount, food quantities, space per guest, vendor
 * payment terms, plus the two in-house entries that grade-D assumptions cite (research
 * note 04 §2.4, §8.3–8.4; synthesis VEN-04). Boundary: metadata only; merged in sources.ts.
 */
import type { SourceEntry } from './source-types.js';

/** The method page lists every assumption, so grade-D rows link there rather than nowhere. */
const ASSUMPTIONS_URL = 'https://intezaam.lehana.in/about#assumptions';

export const PRACTICE_SOURCES = {
  'S-HASSANCHEF-2026': {
    title: 'Banquet sheet calculator for 100 guests',
    publisher: 'hassanchef.com',
    url: 'https://www.hassanchef.com/2026/08/banquet-sheet-calculator-100-guests.html',
    year: 2026,
    confidence: 'C',
  },
  'S-WW-ATTENDANCE-ND': {
    title: 'What share of invited guests actually attend? (forum thread)',
    publisher: 'WeddingWire',
    url: 'https://www.weddingwire.com/wedding-forums/whats-the-average-numberpercentage-for-who-will-actually-show/1bc5a17c0979ce0e.html',
    year: 'n.d.',
    confidence: 'C',
  },
  'S-WW-NOSHOW-ND': {
    title: 'How many no-shows did you have? (forum thread)',
    publisher: 'WeddingWire',
    url: 'https://www.weddingwire.com/wedding-forums/how-many-no-shows-did-you-have/77bbdd4703956b3c.html',
    year: 'n.d.',
    confidence: 'C',
  },
  'S-DTE-2018': {
    title: 'About 10–15% of wedding food is wasted (Feeding India co-founder)',
    publisher: 'Down To Earth',
    url: 'https://www.downtoearth.org.in/food/now-there-s-a-way-to-offset-food-wasted-at-weddings-62466',
    year: 2018,
    confidence: 'B',
  },
  'S-ARABIA-ND': {
    title: 'Calculating room capacity for weddings',
    publisher: 'Arabia Weddings',
    url: 'https://www.arabiaweddings.com/tips/calculating-room-capacity-weddings',
    year: 'n.d.',
    confidence: 'C',
  },
  'S-SOCIALTABLES-ND': {
    title: 'How much space each guest needs',
    publisher: 'Social Tables',
    url: 'https://www.socialtables.com/?p=27737',
    year: 'n.d.',
    confidence: 'C',
  },
  'S-QUIRKS-ND': {
    title: 'Poor response rates perturb party-throwing parents',
    publisher: 'Quirks',
    url: 'https://www.quirks.com/articles/poor-response-rates-perturb-party-throwing-parents',
    year: 'n.d.',
    confidence: 'C',
  },
  'S-ZOLA-ND': {
    title: 'AI wedding planning guide (weekday venue savings, US market)',
    publisher: 'Zola',
    url: 'https://www.zola.com/expert-advice/ai-wedding-planning-guide',
    year: 'n.d.',
    confidence: 'C',
  },
  'S-VENDOR-ADVANCE-2026': {
    title: 'Vendor listings with stated advance terms (a sample of four)',
    publisher: 'WedMeGood and WeddingWire India listings',
    url: 'https://wedmegood.com/profile/Light-Room-2055102',
    year: 2026,
    confidence: 'C',
  },
  'S-LAWRATO-ND': {
    title: 'Advance not refunded by an event manager (lawyers answer)',
    publisher: 'LawRato',
    url: 'https://lawrato.com/recovery-legal-advice/paid-amount-to-event-manager-for-wedding-but-not-refunding-the-amount-272391',
    year: 'n.d.',
    confidence: 'C',
  },
  // Community occasions (09 §5.5): RWA practice, Onam and the flag code.
  'S-ADDA-2024': {
    title: 'What is RWA (Resident Welfare Association)? Roles and responsibilities',
    publisher: 'ADDA blog (Kasturi Gulhane)',
    url: 'https://blog.ind.adda.io/2024/09/what-is-rwa/',
    year: 2024,
    confidence: 'C',
  },
  'S-WIKI-ONAM': {
    title: 'Onam',
    publisher: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Onam',
    year: 'n.d.',
    confidence: 'B',
  },
  'S-FLAG-CODE-2022': {
    title: 'Flag Code of India: the December 2021 and 2022 amendments',
    publisher: 'Finology Legal',
    url: 'https://finologylegal.in/blog/Legal-news/flag-code-of-india',
    year: 2022,
    confidence: 'C',
  },
  'S-OWNER-DEFAULTS': {
    title: "Defaults carried over from the owner's earlier event planner (unsourced)",
    publisher: 'Intezaam method page',
    url: ASSUMPTIONS_URL,
    year: 2026,
    confidence: 'D',
  },
  'S-INTEZAAM-D': {
    title: 'Intezaam planning assumptions, derived from the sources in this register',
    publisher: 'Intezaam method page',
    url: ASSUMPTIONS_URL,
    year: 2026,
    confidence: 'D',
  },
} as const satisfies Readonly<Record<string, SourceEntry>>;
