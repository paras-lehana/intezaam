/**
 * Source register, part 2: noise rules, permissions, crowd safety and accessibility.
 *
 * Responsibility: the statutes, government guidance and press reports behind the
 * permissions, crowd and accessibility checklists (research note 04 §6, §8.8).
 * Boundary: metadata only; merged with the other parts in sources.ts.
 */
import type { SourceEntry } from './source-types.js';

export const LAW_SOURCES = {
  'S-NOISE-RULE5-ND': {
    title: 'Noise Pollution (Regulation and Control) Rules, 2000: Rule 5 text',
    publisher: 'Morung Express (reproduction of the Rules)',
    url: 'https://morungexpress.com/noise-pollution-regulation-and-control-rules-2000',
    year: 'n.d.',
    confidence: 'A',
  },
  'S-NOISE-SCHEDULE-2022': {
    title: 'Ambient noise standards under the Noise Rules 2000 (state circular)',
    publisher: 'Government of Karnataka',
    url: 'https://kannada.oneindia.com/downloads/2022/5/Circular.pdf',
    year: 2022,
    confidence: 'A',
  },
  'S-NOISE-PERIPHERY-2022': {
    title: 'Loudspeaker limits at the boundary of a public place',
    publisher: 'The Quint',
    url: 'https://www.thequint.com/news/law/azaan-bhajan-row-law-use-of-loudspeakers-noise-pollution-rules-supreme-court',
    year: 2022,
    confidence: 'A',
  },
  'S-SILENCE-ZONE-2000': {
    title: 'Noise Pollution (Regulation and Control) Rules, 2000 (silence zones)',
    publisher: 'India Environment Portal',
    url: 'https://indiaenvironmentportal.org.in/reports-and-documents/noise-pollution-regulation-and-control-rules-2000',
    year: 2000,
    confidence: 'A',
  },
  'S-BMC-2026': {
    title: 'Ganeshotsav 2026: single window for mandal permissions and police NOCs',
    publisher: 'Free Press Journal',
    url: 'https://www.freepressjournal.in/mumbai/ganeshotsav-2026-bmc-launches-online-single-window-system-for-ganpati-mandal-permissions-and-police-nocs',
    year: 2026,
    confidence: 'B',
  },
  'S-SAHAJ-2026': {
    title: 'Durga Puja 2026 permissions in West Bengal: the SAHAJ portal',
    publisher: 'Hindutone',
    url: 'https://hindutone.com/festivals/navratri/durga-puja-2026-west-bengal-permission-sahaj-portal-guidelines/',
    year: 2026,
    confidence: 'C',
  },
  'S-IMMERSION-2026': {
    title: 'Ganesh immersion and procession permissions, Mumbai',
    publisher: 'Hindutone',
    url: 'https://hindutone.com/festivals/ganesh-chaturthi/ganesh-nimajjanam-permissions-mumbai/',
    year: 2026,
    confidence: 'C',
  },
  'S-MONEYLIFE-2017': {
    title: 'How to ensure a safe and hazard-free festive season (pandal fire safety, exits, NOC)',
    publisher: 'Moneylife (IANS)',
    url: 'https://www.moneylife.in/article/how-to-ensure-a-safe-and-hazardfree-festive-season/51754.html',
    year: 2017,
    confidence: 'B',
  },
  'S-THEPRINT-2026': {
    title:
      'Kolkata Police asks Durga Puja organisers to adhere to safety norms (crowds, entry and exit routes)',
    publisher: 'ThePrint (PTI)',
    url: 'https://theprint.in/india/kolkata-police-asks-durga-puja-organisers-to-strictly-adhere-to-safety-norms/3054247/',
    year: 2026,
    confidence: 'B',
  },
  'S-LEAFLET-2025': {
    title: 'Green firecrackers allowed for Diwali under strict conditions (Supreme Court)',
    publisher: 'The Leaflet',
    url: 'https://theleaflet.in/leaflet-reports/bursting-of-green-firecrackers-allowed-in-delhi-ncr-for-diwali-but-under-strict-conditions-notes-supreme-court',
    year: 2025,
    confidence: 'A',
  },
  'S-SCCONLINE-2018': {
    title:
      'Time slot for bursting firecrackers modified for southern states (Arjun Gopal v. Union of India)',
    publisher: 'SCC Online',
    url: 'https://www.scconline.com/blog/post/2018/10/30/time-slot-of-bursting-firecrackers-during-diwali-for-southern-states-modified-sc/',
    year: 2018,
    confidence: 'A',
  },
  'S-NOBROKERHOOD-ND': {
    title: 'Society festival committees: budget heads, funding and volunteers',
    publisher: 'NoBrokerHood',
    url: 'https://www.nobrokerhood.com/blog/independence-day-celebration-in-apartments/',
    year: 'n.d.',
    confidence: 'C',
  },
  'S-NDMA-2014': {
    title: 'Managing Crowds at Events and Venues of Mass Gathering',
    publisher: 'National Disaster Management Authority',
    url: 'https://sdma.goa.gov.in/sites/default/files/2022-05/managingcrowdsguide.pdf',
    year: 2014,
    confidence: 'A',
  },
  'S-GKTODAY-2021': {
    title: 'Harmonised Guidelines for Universal Accessibility in India 2021 (summary)',
    publisher: 'GKToday',
    url: 'https://www.gktoday.in/guidelines-for-universal-accessibility-in-india-2021/',
    year: 2021,
    confidence: 'A',
  },
  'S-SCPD-2025': {
    title: 'Accessible toilets ordered on the ground floor of public buildings',
    publisher: 'Eastern Mirror',
    url: 'https://www.easternmirrornagaland.com/scpd-issues-orders-on-nla-high-court-complexes',
    year: 2025,
    confidence: 'A',
  },
} as const satisfies Readonly<Record<string, SourceEntry>>;
