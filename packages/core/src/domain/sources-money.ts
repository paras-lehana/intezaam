/**
 * Source register, part 1: budgets, catering, birthdays and GST.
 *
 * Responsibility: the published sources behind budget splits, cost bands, per-plate
 * prices and tax rates. Boundary: metadata
 * only; merged with the other parts in sources.ts.
 */
import type { SourceEntry } from './source-types.js';

export const MONEY_SOURCES = {
  'S-WP-2026': {
    title: 'Indian wedding budget breakdown by percentage',
    publisher: 'weddingplanning.in',
    url: 'https://www.weddingplanning.in/guides/indian-wedding-budget-breakdown.php',
    year: 2026,
    confidence: 'C',
  },
  'S-VK-2026': {
    title: 'Indian wedding cost 2026: budget breakdown by guests',
    publisher: 'velvetknot.in',
    url: 'https://velvetknot.in/indian-wedding-cost-budget-breakdown/',
    year: 2026,
    confidence: 'C',
  },
  'S-VKPLATE-2026': {
    title: 'Wedding cost per plate in India 2026',
    publisher: 'velvetknot.in',
    url: 'https://velvetknot.in/wedding-cost-per-plate-india/',
    year: 2026,
    confidence: 'C',
  },
  'S-IMW-2026': {
    title: 'How to plan a wedding in India: budget and 12-month timeline',
    publisher: 'itsmy.wedding',
    url: 'https://www.itsmy.wedding/blog/how-to-plan-a-wedding-in-india',
    year: 2026,
    confidence: 'C',
  },
  'S-RSA-2026': {
    title: 'Wedding catering cost per plate in India, city-wise',
    publisher: 'recipescalerapp.com',
    url: 'https://recipescalerapp.com/wedding-catering-cost-per-plate-india/',
    year: 2026,
    confidence: 'C',
  },
  'S-MANYAVAR-2024': {
    title: 'Step-wise wedding planning checklist',
    publisher: 'Manyavar',
    url: 'https://www.manyavar.com/en-in/blog-wedding-planning-checklist-guide.html',
    year: 2024,
    confidence: 'C',
  },
  'S-CAIT-2025': {
    title: 'Wedding season 2025 trade estimate (press release)',
    publisher: 'Confederation of All India Traders',
    url: 'https://cait.in//images/press-release/pdf_1762754341.pdf',
    year: 2025,
    confidence: 'B',
  },
  'S-WMG-2025': {
    title: 'WedMeGood 2025 wedding survey (PTI report)',
    publisher: 'Free Press Journal',
    url: 'https://www.freepressjournal.in/business/2025-lavish-indian-weddings-thrive-with-8-higher-spending-despite-soaring-gold-prices',
    year: 2025,
    confidence: 'B',
  },
  'S-WMG-2024': {
    title: 'WedMeGood 2024 wedding survey',
    publisher: 'Outlook Money',
    url: 'https://www.outlookmoney.com/personal-finance/average-weddings-budget-hits-rs-37-lakh-in-2024-destination-weddings-top-rs-50-lakh',
    year: 2024,
    confidence: 'B',
  },
  'S-WWI-2021': {
    title: 'Newlyweds report 2021 (vendor booking shares)',
    publisher: 'WeddingWire India',
    url: 'https://www.weddingwire.in/wedding-tips/weddingwire-india-reveals-the-newlyweds-report-2021--c11025',
    year: 2021,
    confidence: 'B',
  },
  'S-CHOCOCRAFT-2025': {
    title: 'Birthday party budget breakdown',
    publisher: 'ChocoCraft',
    url: 'https://www.chococraft.in/blogs/birthday/birthday-party-budget-breakdown',
    year: 2025,
    confidence: 'C',
  },
  'S-CHARMBOX-2026': {
    title: 'Kids birthday party budget in India 2026',
    publisher: 'Charmbox',
    url: 'https://charmbox.in/blogs/charmbox-daily/kids-birthday-party-budget-india',
    year: 2026,
    confidence: 'C',
  },
  'S-VENUELOOK-ND': {
    title: 'How to plan a budget-friendly first birthday celebration',
    publisher: 'VenueLook',
    url: 'https://www.venuelook.com/blog/how-to-plan-a-budget-friendly-first-birthday-celebration',
    year: 'n.d.',
    confidence: 'C',
  },
  'S-GIFTLIST-ND': {
    title: 'Birthday party checklist and timeline',
    publisher: 'Giftlist',
    url: 'https://giftlist.com/blog/birthday-party-checklist-timeline',
    year: 'n.d.',
    confidence: 'C',
  },
  'S-BEVY-ND': {
    title: 'Checklist for planning a successful community event',
    publisher: 'Bevy',
    url: 'https://bevy.com/b/blog/checklist-for-planning-a-successful-community-event',
    year: 'n.d.',
    confidence: 'C',
  },
  'S-CBIC-2025': {
    title: 'CBIC notifications 15/2025 and 16/2025 on service rates (effective 22 Sep 2025)',
    publisher: 'taxo.online',
    url: 'https://taxo.online/latest-news/18-09-2025-cbic-issued-notifications-to-give-effect-to-the-recommendations-of-the-56th-council-meeting-in-respect-to-rate-and-exemption-on-services/',
    year: 2025,
    confidence: 'B',
  },
  'S-HNA-2025': {
    title: 'GST 2.0 changes for hospitality (56th GST Council)',
    publisher: 'HNA & Co LLP',
    url: 'https://hnallp.com/assets/articles/b8814-hospitality_56thcouncilmeeting-hna-sept25_ss_rm_v1_18.9.25-1-.pdf',
    year: 2025,
    confidence: 'B',
  },
  'S-TAXGARDEN-2026': {
    title: 'GST for tent house, shamiana and decorators (AY 2026-27)',
    publisher: 'taxgarden.in',
    url: 'https://taxgarden.in/blog/income-tax-gst-for-tent-house-shamiana-decorators-india-ay-2026-27',
    year: 2026,
    confidence: 'C',
  },
  'S-TAXGURU-ND': {
    title: 'GST on catering, restaurant and hotel accommodation',
    publisher: 'TaxGuru',
    url: 'https://taxguru.in/goods-and-service-tax/gst-catering-restaurant-hotel-accommodation-service.html',
    year: 'n.d.',
    confidence: 'C',
  },
  'S-BUSY-HALL-ND': {
    title: 'GST rate on marriage hall rental',
    publisher: 'Busy',
    url: 'https://busy.in/gst-rates/marriage-hall',
    year: 'n.d.',
    confidence: 'C',
  },
  'S-BUSY-PHOTO-2026': {
    title: 'SAC 998383: photography and videography services',
    publisher: 'Busy',
    url: 'https://busy.in/sac-code-998383/',
    year: 2026,
    confidence: 'C',
  },
  'S-BUSY-EVENT-ND': {
    title: 'SAC 998596: event and convention management',
    publisher: 'Busy',
    url: 'https://busy.in/sac-code-998596/',
    year: 'n.d.',
    confidence: 'C',
  },
} as const satisfies Readonly<Record<string, SourceEntry>>;
