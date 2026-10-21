/**
 * Curated ideas, part 6: regional and occasion ideas — what one tradition or festival does
 * and the others do not (feature #29 offline library).
 *
 * Responsibility: ideas tagged with the traditions or community occasions they belong to,
 * so the selector shows them only to that family or festival and ranks them first there:
 * Onam's sadya and pookalam, Navratri's Garba, Ganesh utsav's modak and dhol-tasha, Durga
 * Puja's dhunuchi dance, and the nadaswaram, kolam and banana-leaf meal of South Indian
 * homes (the nadaswaram vendor type, domain/vendors.ts). No prices: code attaches the cost
 * band. Boundary: data only.
 */
import type { LibraryIdea } from './idea-types.js';

const SOUTH_INDIAN = ['tamil', 'telugu'] as const;

export const REGIONAL_IDEAS: readonly LibraryIdea[] = [
  {
    category: 'menu',
    title: 'Onam sadya on plantain leaves',
    description:
      "A vegetarian sadya served on plantain leaves with residents' families cooking the dishes together.",
    why: ['tradition', 'The way Onam is shared in Kerala.'],
    effort: 'high',
    eco: true,
    costBand: 'within',
    youtubeQuery: 'onam sadya serving order',
    fit: {
      families: ['community'],
      occasions: ['onam'],
      styles: ['regional', 'traditional'],
      contains: ['root-veg'],
    },
  },
  {
    category: 'decor',
    title: 'Pookalam by every wing',
    description:
      'Each wing lays a flower carpet in the courtyard on the first morning, growing it ring by ring over the festival days.',
    why: ['tradition', 'The flower carpet that welcomes Onam.'],
    effort: 'med',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'onam pookalam design simple',
    fit: { families: ['community'], occasions: ['onam'], styles: ['floral', 'traditional'] },
  },
  {
    category: 'activity',
    title: 'Garba workshop before the big night',
    description:
      'A short evening class teaches the basic steps so first-timers and children join the circle on the main night.',
    why: ['tradition', 'Helps every resident take part in Navratri.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'garba basic steps tutorial',
    fit: {
      families: ['community', 'wedding'],
      occasions: ['navratri-garba'],
      traditions: ['gujarati'],
      styles: ['traditional', 'colourful'],
    },
  },
  {
    category: 'menu',
    title: 'Ukadiche modak for the bhog',
    description:
      'Steamed rice-flour modak filled with coconut and jaggery, made with the residents on the first morning and offered as bhog.',
    why: ['tradition', "Ganpati's favourite sweet, made together."],
    effort: 'med',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'ukadiche modak recipe',
    fit: {
      families: ['community', 'family-function'],
      occasions: ['ganesh-utsav'],
      traditions: ['marathi'],
      styles: ['traditional', 'regional'],
    },
  },
  {
    category: 'music',
    title: 'Dhol-tasha pathak for the arrival and visarjan',
    description:
      'A local dhol-tasha group leads the idol in and out; agree the route and a stop time well inside the night-sound limit.',
    why: ['tradition', 'The sound of a Maharashtrian Ganesh utsav.'],
    effort: 'med',
    eco: true,
    costBand: 'within',
    youtubeQuery: 'dhol tasha pathak ganpati',
    fit: {
      families: ['community'],
      occasions: ['ganesh-utsav'],
      traditions: ['marathi'],
      styles: ['traditional', 'grand', 'colourful'],
    },
  },
  {
    category: 'activity',
    title: 'Dhunuchi dance at the evening aarti',
    description:
      'Residents dance with clay incense burners to the dhak after the evening aarti, with water buckets and space kept clear.',
    why: ['tradition', 'The heart of a Durga Puja evening.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'dhunuchi naach durga puja',
    fit: {
      families: ['community'],
      occasions: ['durga-puja'],
      traditions: ['bengali'],
      styles: ['traditional'],
    },
  },
  {
    category: 'music',
    title: 'Nadaswaram and thavil at the entrance',
    description:
      'A nadaswaram and thavil duo plays as guests arrive and through the main ritual, the auspicious sound of a South Indian function.',
    why: ['tradition', 'Rooted in South Indian custom and loved by elders.'],
    effort: 'low',
    eco: true,
    costBand: 'within',
    youtubeQuery: 'nadaswaram thavil wedding',
    fit: {
      families: ['wedding', 'birthday', 'family-function'],
      traditions: SOUTH_INDIAN,
      styles: ['traditional', 'classic'],
    },
  },
  {
    category: 'decor',
    title: 'Rice-flour kolam and mango-leaf thoranam',
    description:
      'A large kolam at the threshold drawn by the family that morning and a fresh mango-leaf thoranam over the door.',
    why: ['tradition', 'How a South Indian home welcomes guests on a big day.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'kolam design for function',
    fit: {
      families: ['birthday', 'family-function'],
      traditions: SOUTH_INDIAN,
      styles: ['traditional', 'minimal', 'regional'],
    },
  },
  {
    category: 'menu',
    title: 'Satvik saapadu on banana leaves',
    description:
      'A full South Indian satvik meal served on banana leaves in the traditional order, from payasam to curd rice.',
    why: ['tradition', 'The festive meal elders expect, and no plastic plates.'],
    effort: 'med',
    eco: true,
    costBand: 'within',
    youtubeQuery: 'banana leaf meal serving order tamil',
    fit: {
      families: ['birthday', 'family-function'],
      traditions: SOUTH_INDIAN,
      styles: ['traditional', 'regional'],
    },
  },
  {
    category: 'activity',
    title: 'Grandchildren lead the couple to the mandapam',
    description:
      'The grandchildren walk the couple in for the re-tying of the thali, and elders sit near the mandapam to bless them.',
    why: ['tradition', 'A Shashtiabdapoorthi moment the whole family shares.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    budgetLine: 'rituals',
    youtubeQuery: 'shashtiabdapoorthi ceremony',
    fit: {
      families: ['birthday'],
      kinds: ['sixtieth-birthday'],
      traditions: SOUTH_INDIAN,
      styles: ['traditional', 'intimate'],
    },
  },
];
