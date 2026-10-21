/**
 * Wedding task templates, tradition-specific (TL-09).
 *
 * Responsibility: tasks that only some traditions need — muhurat and pandit for Hindu
 * weddings, the gurdwara for the Anand Karaj, the qazi and paperwork for a Nikah, the
 * church and banns for a Christian wedding. Boundary: templates only; the
 * condition on each row decides whether it enters a plan.
 */
import type { TaskTemplate } from './task-types.js';
import { taskFactory } from './task-types.js';
import { monthsToDays } from './timeline.js';

const weddingTask = taskFactory(['wedding']);

export const WEDDING_TRADITION_TASKS: readonly TaskTemplate[] = [
  weddingTask({
    id: 'w-muhurat-dates',
    phase: 'decide',
    leadDays: monthsToDays(12),
    condition: 'hindu-muhurat',
    vendorType: 'pandit',
    title: 'Get muhurat dates from your family priest',
    why: 'Dates decide the venue, and peak-season muhurat dates fill 8–12 months ahead.',
    core: true,
    ruleId: 'TL-09',
    sourceId: 'S-IMW-2026',
  }),
  weddingTask({
    id: 'w-book-pandit',
    phase: 'book-core',
    leadDays: monthsToDays(6),
    condition: 'hindu-muhurat',
    vendorType: 'pandit',
    title: 'Book your pandit and confirm the muhurat',
    why: 'Priests are busiest on muhurat dates; confirm the time for your date.',
    dependsOn: ['w-muhurat-dates'],
    core: true,
    ruleId: 'TL-09',
    sourceId: 'S-IMW-2026',
  }),
  weddingTask({
    id: 'w-book-gurdwara',
    phase: 'book-core',
    leadDays: monthsToDays(6),
    condition: 'gurdwara',
    vendorType: 'granthi',
    title: 'Book the gurdwara for the Anand Karaj',
    why: 'The Anand Karaj takes place only in a gurdwara, not at a resort.',
    core: true,
    ruleId: 'TL-09',
    sourceId: 'S-WIKI-ANAND-KARAJ',
    confidence: 'B',
  }),
  weddingTask({
    id: 'w-book-qazi',
    phase: 'book-core',
    leadDays: monthsToDays(3),
    condition: 'nikah',
    vendorType: 'qazi',
    title: 'Book the qazi for the Nikah',
    why: 'The qazi confirms the documents and witnesses the nikahnama needs.',
    core: true,
    ruleId: 'TL-09',
    sourceId: 'S-WIKI-NIKAH',
    confidence: 'D',
  }),
  weddingTask({
    id: 'w-book-church',
    phase: 'book-core',
    leadDays: monthsToDays(6),
    condition: 'church',
    vendorType: 'church_minister',
    title: 'Book the church and the minister',
    why: 'The parish reads the banns weeks before, so the date must be set early.',
    core: true,
    ruleId: 'TL-09',
    sourceId: 'S-WIKI-ICMA',
    confidence: 'D',
  }),
  weddingTask({
    id: 'w-nikah-inputs',
    phase: 'finalise',
    leadDays: 30,
    condition: 'nikah',
    title: 'Agree the mahr and confirm two witnesses (and a wali, if your school needs one)',
    why: 'The Nikah needs these settled before the date.',
    dependsOn: ['w-book-qazi'],
    core: true,
    ruleId: 'TL-09',
    sourceId: 'S-WIKI-NIKAH',
    confidence: 'B',
  }),
  weddingTask({
    id: 'w-banns',
    phase: 'finalise',
    leadDays: 30,
    condition: 'church',
    title: 'Ask your parish to read the banns (usually 21–30 days before; check with them)',
    why: 'A church wedding needs notice in the parish before the ceremony.',
    dependsOn: ['w-book-church'],
    core: true,
    ruleId: 'TL-09',
    sourceId: 'S-WIKI-BANNS',
    confidence: 'B',
  }),
];
