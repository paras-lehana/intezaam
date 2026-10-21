/**
 * Source register, part 4: ceremonies, traditions and dietary rules.
 *
 * Responsibility: the reference pages behind ceremony sequences, tradition hard rules
 * and diet rules (research note 04 §4, §5.2, §8.7). Wikipedia pages carry the year they
 * were read. Boundary: metadata only; merged with the other parts in sources.ts.
 */
import type { SourceEntry } from './source-types.js';

/** Wikipedia pages are cited with the year they were accessed (research note 04 §0). */
const ACCESSED_YEAR = 2026;

export const RITUAL_SOURCES = {
  'S-WIKI-PUNJABI': {
    title: 'Punjabi wedding traditions',
    publisher: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Punjabi_wedding_traditions',
    year: ACCESSED_YEAR,
    confidence: 'B',
  },
  'S-WIKI-HINDU-WEDDING': {
    title: 'Hindu wedding',
    publisher: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Hindu_wedding',
    year: ACCESSED_YEAR,
    confidence: 'B',
  },
  'S-WIKI-HALDI': {
    title: 'Haldi (ceremony)',
    publisher: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Haldi_(ceremony)',
    year: ACCESSED_YEAR,
    confidence: 'B',
  },
  'S-WIKI-TELUGU': {
    title: 'Telugu wedding ceremony',
    publisher: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Telugu_wedding_ceremony',
    year: ACCESSED_YEAR,
    confidence: 'B',
  },
  'S-WIKI-BENGALI': {
    title: 'Bengali Hindu wedding',
    publisher: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Bengali_Hindu_wedding',
    year: ACCESSED_YEAR,
    confidence: 'B',
  },
  'S-WIKI-ANAND-KARAJ': {
    title: 'Anand Karaj',
    publisher: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Anand_Karaj',
    year: ACCESSED_YEAR,
    confidence: 'B',
  },
  'S-WIKI-NIKAH': {
    title: 'Nikah',
    publisher: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Nikah',
    year: ACCESSED_YEAR,
    confidence: 'B',
  },
  'S-WIKI-WALIMA': {
    title: 'Walima',
    publisher: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Walima',
    year: ACCESSED_YEAR,
    confidence: 'B',
  },
  'S-WIKI-ICMA': {
    title: 'Indian Christian Marriage Act, 1872',
    publisher: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Indian_Christian_Marriage_Act,_1872',
    year: ACCESSED_YEAR,
    confidence: 'B',
  },
  'S-WIKI-BANNS': {
    title: 'Banns of marriage',
    publisher: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Banns_of_marriage',
    year: ACCESSED_YEAR,
    confidence: 'B',
  },
  'S-WIKI-SHASHTHIPURTI': {
    title: 'Shashthipurti (60th birthday rites)',
    publisher: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Shashthipurti',
    year: ACCESSED_YEAR,
    confidence: 'B',
  },
  'S-WIKI-JAIN-DIET': {
    title: 'Jain vegetarianism',
    publisher: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Jain_vegetarianism',
    year: ACCESSED_YEAR,
    confidence: 'B',
  },
  'S-WIKI-HALAL': {
    title: 'Halal',
    publisher: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Halal',
    year: ACCESSED_YEAR,
    confidence: 'B',
  },
  'S-WEDDINGSUTRA-ND': {
    title: 'The rituals and aspects of Tamil weddings',
    publisher: 'WeddingSutra',
    url: 'https://weddingsutra.com/planning/wedding-tradition-series-explore-the-myriad-rituals-aspects-of-tamil-weddings',
    year: 'n.d.',
    confidence: 'C',
  },
  'S-VEDADHARA-ND': {
    title: 'Tamil Brahmin wedding',
    publisher: 'Vedadhara',
    url: 'https://www.vedadhara.com/tamil-brahmin-wedding',
    year: 'n.d.',
    confidence: 'C',
  },
  'S-AZA-MARATHI-ND': {
    title: 'Your guide to Maharashtrian wedding traditions',
    publisher: 'Aza Fashions',
    url: 'https://www.azafashions.com/blog/your-guide-to-maharashtrian-wedding-traditions/',
    year: 'n.d.',
    confidence: 'C',
  },
  'S-AZA-GUJARATI-ND': {
    title: 'Exploring Gujarati wedding traditions and rituals',
    publisher: 'Aza Fashions',
    url: 'https://www.azafashions.com/blog/exploring-gujarati-wedding-traditions-rituals-and-more',
    year: 'n.d.',
    confidence: 'C',
  },
} as const satisfies Readonly<Record<string, SourceEntry>>;
