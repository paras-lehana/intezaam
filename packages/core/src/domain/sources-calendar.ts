/**
 * Source register, part 3: monsoon, muhurat, calendar pauses and festival dates.
 *
 * Responsibility: the sources behind date intelligence (research note 04 §8.5–8.6 and the
 * festival searches in the synthesis, DATE-01…05). Boundary: metadata only; merged with
 * the other parts in sources.ts.
 */
import type { SourceEntry } from './source-types.js';

export const CALENDAR_SOURCES = {
  'S-IMD-2020': {
    title: 'Normal dates of onset and withdrawal of the southwest monsoon',
    publisher: 'MAUSAM (India Meteorological Department journal)',
    url: 'https://mausamjournal.imd.gov.in/index.php/MAUSAM/article/view/33',
    year: 2020,
    confidence: 'A',
  },
  'S-TRIBUNE-2025': {
    title: 'Southwest monsoon withdraws from the entire country; northeast monsoon sets in',
    publisher: 'The Tribune',
    url: 'https://www.tribuneindia.com/news/india/southwest-monsoon-withdraws-from-entire-country-imd/amp',
    year: 2025,
    confidence: 'A',
  },
  'S-IMD-NEM-2026': {
    title: 'Report on Northeast Monsoon 2025 (Scientific Report IMDC-SR/20)',
    publisher: 'India Meteorological Department, Regional Meteorological Centre Chennai',
    url: 'https://mausam.imd.gov.in/chennai/mcdata/ne_monsoon_2025.pdf',
    year: 2026,
    confidence: 'A',
  },
  'S-CITIZENMATTERS-2016': {
    title: 'Some lessons for Bengaluru from 100 years of rain data',
    publisher: 'Citizen Matters (Ajaya S Bharadwaja)',
    url: 'https://citizenmatters.in/some-lessons-for-bengaluru-from-100-years-of-rain-data/',
    year: 2016,
    confidence: 'C',
  },
  'S-SMARTPUJA-2026': {
    title: 'Vivah muhurat 2026: marriage dates and the Chaturmas pause',
    publisher: 'SmartPuja',
    url: 'https://www.smartpuja.com/blog/vivah-muhurat-2026-marriage-dates',
    year: 2026,
    confidence: 'C',
  },
  'S-SMARTPUJA-KHARMAS-2026': {
    title: 'Vivah muhurat 2026: Kharmas windows',
    publisher: 'SmartPuja',
    url: 'https://www.smartpuja.com/blog/vivah-muhurat-2026/',
    year: 2026,
    confidence: 'C',
  },
  'S-AZA-MUHURAT-2026': {
    title: 'Indian wedding muhurat dates, November–December 2026',
    publisher: 'Aza Fashions',
    url: 'https://www.azafashions.com/blog/blog-indian-wedding-muhurat-dates-nov-dec-2026-outfit-planner/',
    year: 2026,
    confidence: 'C',
  },
  'S-WEDFOCUS-2026': {
    title: 'Wedding dates 2026',
    publisher: 'The Wedding Focus',
    url: 'https://theweddingfocus.com/blog/wedding-dates-2026/',
    year: 2026,
    confidence: 'C',
  },
  'S-WIKI-CHATURMAS': {
    title: 'Chaturmas',
    publisher: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Chaturmas',
    year: 2026,
    confidence: 'B',
  },
  'S-WIKI-DIWALI': {
    title: 'Diwali',
    publisher: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Diwali',
    year: 2026,
    confidence: 'B',
  },
  'S-SMARTPUJA-DIWALI-ND': {
    title: 'Diwali Lakshmi puja date and timings',
    publisher: 'SmartPuja',
    url: 'https://www.smartpuja.com/blog/diwali-lakshmi-puja/',
    year: 'n.d.',
    confidence: 'C',
  },
  'S-DRIK-2027': {
    title: 'Hindu calendar 2027',
    publisher: 'Drik Panchang',
    url: 'https://www.drikpanchang.com/calendars/hindu/hinducalendar.html?year=2027',
    year: 'n.d.',
    confidence: 'C',
  },
  // Muhurat 2026–27: Drik Panchang is the primary computed panchang; the others were diffed
  // against it date by date (research 09, Gap 3 §3.1).
  'S-DRIK-MUHURAT-2026': {
    title: 'Hindu marriage dates with muhurat 2026, New Delhi',
    publisher: 'Drik Panchang',
    url: 'https://www.drikpanchang.com/shubh-dates/shubh-marriage-dates-with-muhurat.html?year=2026',
    year: 2026,
    confidence: 'B',
  },
  'S-DRIK-MUHURAT-2027': {
    title: 'Hindu marriage dates with muhurat 2027, New Delhi',
    publisher: 'Drik Panchang',
    url: 'https://www.drikpanchang.com/shubh-dates/shubh-marriage-dates-with-muhurat.html?year=2027',
    year: 2027,
    confidence: 'B',
  },
  'S-VEDICFEED-2027': {
    title: 'Shubh marriage dates 2027 (monthly pages)',
    publisher: 'VedicFeed',
    url: 'https://vedicfeed.com/shubh-marriage-dates/january-2027/',
    year: 2027,
    confidence: 'C',
  },
  'S-GANESHASPEAKS-2027': {
    title: 'Vivah muhurat 2027',
    publisher: 'GaneshaSpeaks',
    url: 'https://www.ganeshaspeaks.com/muhurat/2027/marriage-muhurat/',
    year: 2027,
    confidence: 'C',
  },
  'S-PANCHANGBODH-2027': {
    title: 'Vivah muhurat 2027, New Delhi',
    publisher: 'PanchangBodh',
    url: 'https://panchangbodh.com/vivah-muhurat?year=2027',
    year: 2027,
    confidence: 'C',
  },
  'S-KUNDLIGPT-2027': {
    title: 'Marriage muhurat 2027',
    publisher: 'KundliGPT',
    url: 'https://kundligpt.com/shubh-muhurat/2027/marriage/',
    year: 2027,
    confidence: 'C',
  },
  'S-DEKHO-2027': {
    title: 'Devshayani Ekadashi 2027',
    publisher: 'Dekho Panchang',
    url: 'https://dekhopanchang.com/en/festivals/devshayani-ekadashi/2027',
    year: 2027,
    confidence: 'C',
  },
  // Festivals: the central government's holiday orders are the primary anchor (grade A).
  'S-DOPT-2026': {
    title:
      'Holidays to be observed in Central Government offices during 2026 (O.M. 12/2/2023-JCA, 3 Jul 2025)',
    publisher: 'Department of Personnel and Training (reproduced by GConnect)',
    url: 'https://www.gconnect.in/news/holidays-to-be-observed-in-central-government-offices-during-the-year-2026.html',
    year: 2025,
    confidence: 'A',
  },
  'S-DOPT-2027': {
    title:
      'Holidays to be observed in Central Government offices during 2027 (O.M. 12/2/2023-JCA, 16 Jul 2026)',
    publisher: 'Department of Personnel and Training (reproduced by StaffNews)',
    url: 'https://www.staffnews.in/2026/07/list-of-holidays-2027-to-be-observed-in-central-government-offices.html',
    year: 2026,
    confidence: 'A',
  },
  'S-OFFICEHOLIDAYS-2027': {
    title: 'Public holidays in India 2027',
    publisher: 'OfficeHolidays',
    url: 'https://www.officeholidays.com/countries/india/2027',
    year: 2027,
    confidence: 'B',
  },
} as const satisfies Readonly<Record<string, SourceEntry>>;
