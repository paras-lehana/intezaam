/**
 * Volunteer roster (feature #33, COM-04): roles, counts, a lead's name and a WhatsApp message.
 *
 * Responsibility: list the engine's roles (one crowd marshal per 100 people, a lead for
 * every other role), let the committee type who leads each, and open WhatsApp with that
 * role's message (core `buildWhatsAppUrl`; the sender picks the chat). Boundary: names stay
 * in this tab; nothing is sent until the reader taps the link in WhatsApp.
 */
import { type ReactElement, useState } from 'react';
import { buildWhatsAppUrl } from '@intezaam/core/integrations';
import { type CommunityPlan, MAX_HOST_NAME_CHARS, type Plan } from '@intezaam/core/schemas';
import { formatIsoDate } from '../common/dates';
import { PanelSection } from '../common/PanelSection';

export interface VolunteerRosterProps {
  readonly plan: Plan;
  readonly community: CommunityPlan;
}

type Volunteer = CommunityPlan['volunteers'][number];

/**
 * The WhatsApp message for one role.
 * @example
 * roleMessage(plan, volunteer, 'Ravi'); // 'Namaste Ravi! For Ganesh utsav on Tue, 14 Sep 2027: …'
 */
export function roleMessage(plan: Plan, volunteer: Volunteer, name: string): string {
  const when =
    plan.contextEcho.dateIso === undefined ? '' : ` on ${formatIsoDate(plan.contextEcho.dateIso)}`;
  const greeting = name.trim() === '' ? 'Namaste!' : `Namaste ${name.trim()}!`;
  const team = volunteer.count > 1 ? ` We need ${volunteer.count} people for this.` : '';
  return `${greeting} For ${plan.title}${when}: could you take on ${volunteer.label} — ${volunteer.duty}?${team} Thank you!`;
}

export function VolunteerRoster({ plan, community }: VolunteerRosterProps): ReactElement {
  const [names, setNames] = useState<Readonly<Partial<Record<string, string>>>>({});
  return (
    <PanelSection
      id="people-roster"
      title="Volunteer roster"
      lede="One crowd marshal for every 100 people, and a named lead for every other role."
    >
      <ul className="plain-list roster" role="list">
        {community.volunteers.map((volunteer) => {
          const name = names[volunteer.role] ?? '';
          const inputId = `roster-${volunteer.role}`;
          return (
            <li key={volunteer.role} className="roster__item panel-soft stack">
              <h4>
                {volunteer.label} <span className="chip">×{volunteer.count}</span>
              </h4>
              <p className="muted">{volunteer.duty}</p>
              <div className="field">
                <label htmlFor={inputId}>Who leads it</label>
                <input
                  id={inputId}
                  type="text"
                  value={name}
                  maxLength={MAX_HOST_NAME_CHARS}
                  onChange={(event) =>
                    setNames((current) => ({ ...current, [volunteer.role]: event.target.value }))
                  }
                />
              </div>
              <a
                className="button button--secondary"
                href={buildWhatsAppUrl(roleMessage(plan, volunteer, name))}
                target="_blank"
                rel="noopener noreferrer"
              >
                Message on WhatsApp <span className="visually-hidden">about {volunteer.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </PanelSection>
  );
}
