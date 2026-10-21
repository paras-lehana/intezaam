/**
 * TASK_TEMPLATES — every checklist template, for every event family (TL-01).
 *
 * Responsibility: concatenate the per-family template lists in a stable order and offer
 * the per-family lookup the timeline engine needs. Boundary: lookups only; scheduling, compression
 * and conditions are evaluated by the timeline engine.
 */
import type { EventFamily } from './events.js';
import type { TaskTemplate } from './task-types.js';
import { BIRTHDAY_TASKS } from './tasks-birthday.js';
import { SIXTIETH_TASKS } from './tasks-sixtieth.js';
import { COMMUNITY_EARLY_TASKS } from './tasks-community-early.js';
import { COMMUNITY_LATE_TASKS } from './tasks-community-late.js';
import { FAMILY_TASKS } from './tasks-family.js';
import { WEDDING_EARLY_TASKS } from './tasks-wedding-early.js';
import { WEDDING_LATE_TASKS } from './tasks-wedding-late.js';
import { WEDDING_TRADITION_TASKS } from './tasks-wedding-tradition.js';

export const TASK_TEMPLATES: readonly TaskTemplate[] = [
  ...WEDDING_EARLY_TASKS,
  ...WEDDING_TRADITION_TASKS,
  ...WEDDING_LATE_TASKS,
  ...BIRTHDAY_TASKS,
  ...SIXTIETH_TASKS,
  ...COMMUNITY_EARLY_TASKS,
  ...COMMUNITY_LATE_TASKS,
  ...FAMILY_TASKS,
];

/**
 * The templates written for one event family (before conditions are applied).
 * @example
 * templatesForFamily('birthday').every((t) => t.families.includes('birthday')); // true
 */
export function templatesForFamily(family: EventFamily): TaskTemplate[] {
  return TASK_TEMPLATES.filter((template) => template.families.includes(family));
}
