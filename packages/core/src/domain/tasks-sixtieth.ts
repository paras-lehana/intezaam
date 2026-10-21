/**
 * 60th-birthday (Shashtiabdapurti) task templates (TL-01, TL-09 for the 60th).
 *
 * Responsibility: the checklist a family needs for the two-day rite with homam and the
 * couple's ceremonial re-wedding (priests, homam materials,
 * kalasha setup, hall or temple, traditional meal, photographer, return gifts, the couple's
 * outfits, seating for elders). The rites are sourced (Wikipedia, grade B); the lead times
 * are our assumptions (grade D). The priest task itself lives with the other birthday
 * templates (`b-sixtieth-priest`). Boundary: templates only.
 */
import type { TaskTemplate } from './task-types.js';
import { taskFactory } from './task-types.js';
import { monthsToDays, weeksToDays } from './timeline.js';

const sixtiethTask = taskFactory(['birthday']);
const SIXTIETH = ['sixtieth-birthday'] as const;
const RITES = 'S-WIKI-SHASHTHIPURTI';

export const SIXTIETH_TASKS: readonly TaskTemplate[] = [
  sixtiethTask({
    id: 's-book-hall',
    phase: 'book-core',
    leadDays: monthsToDays(2),
    kinds: SIXTIETH,
    vendorType: 'venue',
    title: 'Book the hall or temple for both days of the rites',
    why: 'The rites run over two days; halls that host them book like a small wedding.',
    dependsOn: ['b-sixtieth-priest'],
    core: true,
    sourceId: RITES,
    confidence: 'D',
  }),
  sixtiethTask({
    id: 's-book-caterer',
    phase: 'book-core',
    leadDays: weeksToDays(6),
    kinds: SIXTIETH,
    vendorType: 'caterer',
    title: 'Book a caterer for the traditional meal after the rites',
    why: 'The meal is the largest cost; many elders need a satvik menu without onion or garlic.',
    core: true,
    sourceId: RITES,
    confidence: 'D',
  }),
  sixtiethTask({
    id: 's-book-photographer',
    phase: 'book-specialists',
    leadDays: weeksToDays(6),
    kinds: SIXTIETH,
    vendorType: 'photographer',
    title: 'Book a photographer for both days',
    why: 'The homam and the re-wedding happen once, and the family will want them recorded.',
    sourceId: RITES,
    confidence: 'D',
  }),
  sixtiethTask({
    id: 's-couple-outfits',
    phase: 'book-specialists',
    leadDays: weeksToDays(4),
    kinds: SIXTIETH,
    vendorType: 'attire',
    title: "Buy the couple's outfits for the rites and the re-wedding",
    why: 'The couple renew their marriage in the rites; traditional silks take time to buy or stitch.',
    sourceId: RITES,
    confidence: 'D',
  }),
  sixtiethTask({
    id: 's-return-gifts',
    phase: 'book-specialists',
    leadDays: 20,
    kinds: SIXTIETH,
    vendorType: 'return_gifts',
    title: 'Order return gifts (thamboolam) for the guests',
    why: 'Guests leave with a return gift; packed sets take two to three weeks.',
    sourceId: 'S-INTEZAAM-D',
    confidence: 'D',
  }),
  sixtiethTask({
    id: 's-homam-materials',
    phase: 'finalise',
    leadDays: weeksToDays(2),
    kinds: SIXTIETH,
    vendorType: 'pandit',
    title: "Buy the homam materials and kalasha items on the priest's list",
    why: 'The priest lists what the homam and the kalasha setup need.',
    dependsOn: ['b-sixtieth-priest'],
    sourceId: RITES,
    confidence: 'D',
  }),
  sixtiethTask({
    id: 's-elders-plan',
    phase: 'finalise',
    leadDays: weeksToDays(2),
    kinds: SIXTIETH,
    condition: 'accessibility-needs',
    vendorType: 'transport',
    title: 'Arrange seating near the rites, a step-free route and transport for elderly relatives',
    why: 'Many guests at a 60th are elders; the access plan lists the ramps and toilets to check.',
    sourceId: 'S-INTEZAAM-D',
    confidence: 'D',
  }),
  sixtiethTask({
    id: 's-order-of-rites',
    phase: 'final-week',
    leadDays: weeksToDays(1),
    kinds: SIXTIETH,
    title:
      'Agree the order of rites and the meal time with the priest; give the caterer the final count',
    why: 'A written order keeps the homam, the re-wedding and lunch on time for elderly guests.',
    core: true,
    ruleId: 'TL-08',
    sourceId: RITES,
    confidence: 'D',
  }),
];
