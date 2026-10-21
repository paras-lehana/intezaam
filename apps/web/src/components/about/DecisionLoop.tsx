/**
 * The product loop — Describe → Decide → Adjust → Act — as an ordered list.
 *
 * Responsibility: say in four steps who does what (you, Gemini, or tested code). Boundary:
 * static copy; an ordered list so the loop reads correctly without CSS.
 */
import type { ReactElement } from 'react';

export const LOOP_STEPS = [
  {
    name: 'Describe',
    who: 'You — Gemini reads',
    detail:
      'Type a brief in your own words or answer five questions. Gemini turns a brief into form fields and quotes the words it relied on; you confirm them.',
  },
  {
    name: 'Decide',
    who: 'Code decides',
    detail:
      'Tested rules turn your details into a verdict, a budget that adds up, a timeline, vendor checklists, permissions and risks — each with a “Why this?” trace.',
  },
  {
    name: 'Adjust',
    who: 'You — code recomputes',
    detail:
      'Pull a lever, try a what-if or ask for a change. The whole plan is recomputed in your browser and the differences are shown before anything is kept.',
  },
  {
    name: 'Act',
    who: 'Gemini writes — code checks',
    detail:
      'Add reminders to Google Calendar, share on WhatsApp, open the budget in Sheets and send vendor enquiries drafted from your plan’s facts.',
  },
] as const;

export function DecisionLoop(): ReactElement {
  return (
    <section className="card about-loop" aria-labelledby="loop-heading">
      <h2 id="loop-heading">Describe → Decide → Adjust → Act</h2>
      <ol className="plain-list loop" role="list">
        {LOOP_STEPS.map((step, index) => (
          <li key={step.name} className="loop__step panel-soft">
            <span className="loop__number" aria-hidden="true">
              {index + 1}
            </span>
            <h3 className="loop__name">{step.name}</h3>
            <p className="loop__who">{step.who}</p>
            <p className="loop__detail">{step.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
