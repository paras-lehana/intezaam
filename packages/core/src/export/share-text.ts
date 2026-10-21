/**
 * WhatsApp-ready plan summary (feature #39): a short message a family can forward to the
 * group, built only from the plan.
 *
 * Responsibility: title, event, city and date; guests invited and expected; the budget and
 * the verdict headline; days to go; the three most urgent tasks; and the standing note that
 * these are estimates. WhatsApp *bold* marks the title. The title is the user's own text,
 * so it is sanitised; the message is capped so the wa.me link stays short.
 * Boundary: pure; buildWhatsAppUrl turns it into a link.
 */
import { EVENT_KIND_PROFILES } from '../domain/event-kinds.js';
import { clipText, formatLakh } from '../format.js';
import { formatShortDate } from '../offline/describe-brief.js';
import { nextTasks } from '../offline/task-order.js';
import { MAX_TITLE_CHARS } from '../schemas/limits.js';
import type { Plan } from '../schemas/plan.js';
import { sanitizeUserText } from '../security/sanitize.js';

/** About one phone screen; keeps the wa.me link under the 2,000-character cap once encoded. */
export const MAX_SHARE_TEXT_CHARS = 1_000;
/** The message lists the three most urgent tasks. */
const SHARED_TASKS = 3;

/**
 * The plan as a WhatsApp message.
 * @example
 * buildShareText(plan, 'Riya weds Arjun').startsWith('*Riya weds Arjun*'); // true
 */
export function buildShareText(plan: Plan, eventTitle: string): string {
  const echo = plan.contextEcho;
  const title =
    sanitizeUserText(eventTitle, MAX_TITLE_CHARS) || EVENT_KIND_PROFILES[echo.kind].label;
  const date = echo.dateIso === undefined ? 'date not fixed yet' : formatShortDate(echo.dateIso);
  const daysLeft =
    plan.timeline.daysToEvent === null ? [] : [`${plan.timeline.daysToEvent} days to go`];
  const tasks = nextTasks(plan)
    .slice(0, SHARED_TASKS)
    .map((task, index) => `${index + 1}. ${task.title}`);
  const lines = [
    `*${title}*`,
    `${EVENT_KIND_PROFILES[echo.kind].label} · ${echo.cityName} · ${date}`,
    `Guests: ${plan.headcount.invited} invited, about ${plan.headcount.expected} expected`,
    `Budget: ${formatLakh(plan.budget.totalInr)} · ${plan.verdict.headline}`,
    ...daysLeft,
    ...(tasks.length === 0 ? [] : ['', 'Next steps:', ...tasks]),
    '',
    'Estimates from Intezaam: get three written quotes before booking.',
  ];
  return clipText(lines.join('\n'), MAX_SHARE_TEXT_CHARS);
}
