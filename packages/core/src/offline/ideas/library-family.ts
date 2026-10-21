/**
 * Curated ideas, part 4: family functions — engagement, griha pravesh, puja, naming or
 * mundan, godh bharai, anniversary and retirement (feature #29 offline library).
 *
 * Responsibility: small-scale, home-friendly ideas for the occasions families host most
 * often, with satvik and Jain-safe food where a puja is involved. No prices: code attaches
 * the cost band. Boundary: data only.
 */
import type { LibraryIdea } from './idea-types.js';

export const FAMILY_IDEAS: readonly LibraryIdea[] = [
  {
    category: 'decor',
    title: 'Fresh-flower rangoli at the threshold',
    description:
      'A rangoli of marigold and rose petals at the main door for the griha pravesh or puja, made by the family that morning.',
    why: ['tradition', 'A traditional welcome that costs only flowers.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'flower rangoli griha pravesh',
    fit: { families: ['family-function'], styles: ['traditional', 'floral'] },
  },
  {
    category: 'decor',
    title: 'Mango-leaf and tulsi toran',
    description:
      'Fresh mango leaves strung over the doorway with a tulsi plant beside the puja corner.',
    why: ['tradition', 'Auspicious, fresh and nearly free.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'mango leaf toran diy',
    fit: { families: ['family-function', 'community'], styles: ['traditional', 'minimal'] },
  },
  {
    category: 'decor',
    title: 'Pastel garden setting for the ring ceremony',
    description:
      'Pastel drapes, a floral swing or bench for the couple and fairy lights in a garden or terrace for the engagement.',
    why: ['setting', 'Suits an outdoor engagement in pleasant weather.'],
    effort: 'med',
    eco: false,
    costBand: 'within',
    youtubeQuery: 'engagement decoration garden pastel',
    fit: {
      families: ['family-function'],
      styles: ['pastel', 'floral', 'modern'],
      settings: ['outdoor', 'mixed'],
    },
  },
  {
    category: 'menu',
    title: 'Satvik puja bhog',
    description:
      'A no-onion, no-garlic bhog of puri, kheer, halwa and seasonal sabzi that every guest, including satvik eaters, can share.',
    why: ['diet', 'Fits a puja and satvik guests.'],
    effort: 'med',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'satvik bhog thali recipes',
    fit: { families: ['family-function', 'community'], styles: ['traditional'] },
  },
  {
    category: 'menu',
    title: 'High-tea spread for the engagement',
    description:
      'Sandwiches, samosas, dhokla, pastries and masala chai instead of a full dinner for an afternoon ring ceremony.',
    why: ['budget', 'A lighter meal keeps catering in check.'],
    effort: 'low',
    eco: false,
    costBand: 'saves',
    youtubeQuery: 'high tea party menu indian',
    fit: { families: ['family-function', 'birthday'], contains: ['onion-garlic', 'root-veg'] },
  },
  {
    category: 'activity',
    title: 'Godh bharai games',
    description:
      'Gentle games for the guests (guess the baby food, blessings in a jar) while the mother-to-be stays seated and comfortable.',
    why: ['tradition', 'Keeps the ritual light and joyful.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'godh bharai games ideas',
    fit: { families: ['family-function'] },
  },
  {
    category: 'activity',
    title: 'Name-wish board',
    description:
      'At a naming ceremony, guests write a blessing for the baby on a decorated board that the family keeps.',
    why: ['tradition', 'A keepsake from the naming day.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'naming ceremony decoration ideas',
    fit: { families: ['family-function'] },
  },
  {
    category: 'activity',
    title: "Couple's journey photo walk",
    description:
      'A short corridor of photos from the wedding day to today, with the children telling the story at the anniversary.',
    why: ['guests', "Brings the family's memories into the room."],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'anniversary photo display ideas',
    fit: { families: ['family-function'], ages: ['adult', 'elder'] },
  },
  {
    category: 'activity',
    title: 'Garland exchange renewal',
    description:
      'The couple exchange garlands again in front of their children and grandchildren, with a short blessing from the elders.',
    why: ['tradition', 'A simple ritual that moves everyone at an anniversary.'],
    effort: 'low',
    eco: true,
    costBand: 'within',
    youtubeQuery: 'wedding anniversary varmala ceremony',
    fit: { families: ['family-function'], styles: ['traditional', 'intimate'] },
  },
  {
    category: 'music',
    title: 'Live bhajan for the puja',
    description:
      'A small bhajan group with harmonium and dholak for the hour of the puja; no loudspeaker needed indoors.',
    why: ['tradition', 'Fits a puja, path or griha pravesh at home.'],
    effort: 'low',
    eco: true,
    costBand: 'within',
    youtubeQuery: 'bhajan mandali home puja',
    fit: { families: ['family-function'], settings: ['home', 'indoor'] },
  },
  {
    category: 'music',
    title: 'Sitar or flute during lunch',
    description: 'Soft instrumental music while guests eat keeps conversation easy for elders.',
    why: ['accessibility', 'Gentle sound level for elderly guests.'],
    effort: 'low',
    eco: true,
    costBand: 'within',
    youtubeQuery: 'live flute music event',
    fit: {
      families: ['family-function', 'wedding', 'birthday'],
      styles: ['classic', 'minimal', 'intimate'],
    },
  },
  {
    category: 'favours',
    title: 'Tulsi sapling return gift',
    description:
      'A tulsi or money-plant sapling in a clay pot for every family, with a tag thanking them for coming.',
    why: ['eco', 'A living gift that suits a puja or housewarming.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'plant return gift ideas',
    fit: { families: ['family-function', 'community'] },
  },
  {
    category: 'favours',
    title: 'Mithai and dry-fruit thalis',
    description:
      'Small steel or brass thalis with mithai and dry fruit that families keep and reuse.',
    why: ['tradition', 'A traditional gift that is not thrown away.'],
    effort: 'low',
    eco: true,
    costBand: 'within',
    youtubeQuery: 'mithai thali return gift',
    fit: { families: ['family-function', 'wedding'], styles: ['traditional', 'royal'] },
  },
  {
    category: 'theme',
    title: '"This is your life" for a retirement',
    description:
      'Colleagues and family share short stories from the career on a slideshow, ending with the plans for the years ahead.',
    why: ['guests', 'Honours the person, not the venue.'],
    effort: 'med',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'retirement party slideshow ideas',
    fit: { families: ['family-function'], ages: ['adult', 'elder'] },
  },
  {
    category: 'activity',
    title: 'Wishing tree for guests',
    description:
      'A branch in a pot where guests hang handwritten wishes on paper leaves; the family reads them after the function.',
    why: ['eco', 'A keepsake made of paper and string.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'wishing tree diy party',
    fit: { families: ['family-function', 'birthday', 'wedding'] },
  },
  {
    category: 'theme',
    title: 'Accessible courtyard lunch for elders',
    description:
      'Ground-floor seating with backrests, a ramp at the entrance, shade and food served at the table for elderly guests.',
    why: ['accessibility', 'Lets grandparents join every part of the day.'],
    effort: 'med',
    eco: true,
    costBand: 'within',
    youtubeQuery: 'elderly friendly event seating',
    fit: { families: ['family-function', 'birthday', 'wedding'], ages: ['elder', 'adult'] },
  },
];
