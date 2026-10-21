/**
 * Curated ideas, part 5: ideas that suit any celebration — food counters (including the
 * non-veg and bar ideas the diet and alcohol filters must remove), access, eco and music
 * (feature #29 offline library).
 *
 * Responsibility: the ideas every plan can draw on, tagged with what they contain so a
 * Jain or vegetarian menu or an alcohol-free event never sees the wrong one. No prices:
 * code attaches the cost band. Boundary: data only.
 */
import { ANY_FAMILY, type LibraryIdea } from './idea-types.js';

export const SHARED_IDEAS: readonly LibraryIdea[] = [
  {
    category: 'menu',
    title: 'Live kebab and tikka grill',
    description:
      'A live grill of chicken tikka, seekh kebab and paneer tikka for guests who eat non-veg, on a separate counter.',
    why: ['diet', 'For a mixed or non-veg menu, kept apart from the veg food.'],
    effort: 'med',
    eco: false,
    costBand: 'within',
    youtubeQuery: 'live kebab counter setup',
    fit: { families: ANY_FAMILY, contains: ['meat', 'onion-garlic'] },
  },
  {
    category: 'menu',
    title: 'Licensed bar with signature cocktails',
    description:
      'A licensed bartender with two signature cocktails named after the hosts, plus mocktails for everyone else.',
    why: ['style', 'For hosts who chose to serve alcohol.'],
    effort: 'med',
    eco: false,
    costBand: 'splurge',
    youtubeQuery: 'signature cocktails party ideas',
    fit: {
      families: ['wedding', 'birthday', 'family-function'],
      ages: ['adult'],
      contains: ['alcohol'],
    },
  },
  {
    category: 'menu',
    title: 'Seasonal mocktail bar',
    description:
      'Aam panna in summer, hot kahwa in winter and fresh lime soda all year, served from glass dispensers.',
    why: ['diet', 'Alcohol-free and welcome at every event.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'mocktail bar ideas indian party',
    fit: { families: ANY_FAMILY },
  },
  {
    category: 'menu',
    title: 'Egg station for breakfast functions',
    description:
      'A live omelette and egg-bhurji counter for a morning haldi or a day-after brunch.',
    why: ['diet', 'For guests who eat eggs at a morning function.'],
    effort: 'low',
    eco: false,
    costBand: 'saves',
    youtubeQuery: 'live egg counter breakfast',
    fit: { families: ['wedding', 'family-function'], contains: ['egg', 'onion-garlic'] },
  },
  {
    category: 'decor',
    title: 'Rented decor instead of bought',
    description:
      'Rent lamps, urlis, drapes and stands from a tent house and return them the next day; buy only fresh flowers.',
    why: ['budget', 'Keeps the decor line from growing.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'event decor on rent ideas',
    fit: { families: ANY_FAMILY },
  },
  {
    category: 'decor',
    title: 'Clear signage in two languages',
    description:
      'Large signs in English and the local language for food, toilets, parking and the exit, readable from a wheelchair.',
    why: ['accessibility', 'Helps elders and first-time visitors find their way.'],
    effort: 'low',
    eco: false,
    costBand: 'saves',
    youtubeQuery: 'event signage ideas diy',
    fit: { families: ANY_FAMILY },
  },
  {
    category: 'activity',
    title: 'Quiet room for elders and babies',
    description:
      'A side room with chairs, water and dim light away from the speakers where elders rest and parents feed babies.',
    why: ['accessibility', 'Gives elders and young families a break from the noise.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'quiet room at events',
    fit: { families: ANY_FAMILY },
  },
  {
    category: 'activity',
    title: 'Instant-print photo guestbook',
    description:
      'Guests take an instant photo, stick it in a book and write a line beside it; the family keeps the album.',
    why: ['style', 'A modern, quirky keepsake.'],
    effort: 'low',
    eco: false,
    costBand: 'within',
    youtubeQuery: 'polaroid guest book ideas',
    fit: { families: ANY_FAMILY, styles: ['modern', 'quirky'] },
  },
  {
    category: 'music',
    title: 'Dhol for the grand entry',
    description:
      'A dhol player for the entry of the couple, the birthday star or the idol; finish amplified sound before quiet hours.',
    why: ['tradition', 'The sound of celebration across North India.'],
    effort: 'low',
    eco: true,
    costBand: 'within',
    youtubeQuery: 'dhol entry ideas',
    fit: { families: ANY_FAMILY, styles: ['traditional', 'grand', 'colourful'] },
  },
  {
    category: 'music',
    title: 'Family playlist by generation',
    description:
      "Each generation picks ten songs; the playlist moves from the grandparents' favourites to the children's.",
    why: ['guests', 'Everyone hears music they love.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'party playlist ideas bollywood all ages',
    fit: { families: ANY_FAMILY },
  },
  {
    category: 'favours',
    title: 'Handloom potli with sweets',
    description: 'Small handloom potli bags with sweets or dry fruit, sourced from a local weaver.',
    why: ['eco', 'Supports local weavers and is reused.'],
    effort: 'low',
    eco: true,
    costBand: 'within',
    youtubeQuery: 'potli bag return gift ideas',
    fit: { families: ANY_FAMILY, styles: ['traditional', 'regional'] },
  },
  {
    category: 'favours',
    title: 'Plantable seed pencils',
    description:
      'Pencils with seeds in the cap that grow into herbs once used up; a small, cheap gift for every guest.',
    why: ['eco', 'Zero plastic and fun for children.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'plantable seed pencil gift',
    fit: { families: ANY_FAMILY },
  },
];
