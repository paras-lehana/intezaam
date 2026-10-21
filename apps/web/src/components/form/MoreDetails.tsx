/**
 * The "More details" disclosure: family-specific detail, then personalisation.
 *
 * Responsibility: keep the first screen to five questions while every optional input is
 * one tap away — tradition and functions, birthday or community extras for that family,
 * then venue, food, priorities, style, access, sound, help and language. Boundary: a
 * native <details> (keyboard and screen-reader support built in), controlled so validation
 * can open it before focusing a field inside.
 */
import type { ReactElement } from 'react';
import { BirthdayFields } from './BirthdayFields';
import { CommunityFields } from './CommunityFields';
import { EventDetails } from './EventDetails';
import { FoodFields } from './FoodFields';
import type { SectionProps } from './form-fields';
import { HelpLanguageFields } from './HelpLanguageFields';
import { PriorityFields } from './PriorityFields';
import { SoundFields } from './SoundFields';
import { StyleAccessFields } from './StyleAccessFields';
import { VenueFields } from './VenueFields';

export interface MoreDetailsProps extends SectionProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export const MORE_DETAILS_LABEL = 'More details';

export function MoreDetails({ open, onOpenChange, ...section }: MoreDetailsProps): ReactElement {
  const { family } = section.state;
  return (
    <details
      className="more-details"
      open={open}
      onToggle={(event) => onOpenChange(event.currentTarget.open)}
    >
      <summary className="more-details__summary">
        <span className="more-details__label">{MORE_DETAILS_LABEL}</span>
        <span className="more-details__hint">
          Tradition, functions, food, priorities, style, access needs and language — all optional
        </span>
      </summary>
      <div className="more-details__body">
        <EventDetails {...section} />
        {family === 'birthday' ? <BirthdayFields {...section} /> : null}
        {family === 'community' ? <CommunityFields {...section} /> : null}
        <VenueFields {...section} />
        <FoodFields {...section} />
        <PriorityFields {...section} />
        <StyleAccessFields {...section} />
        <SoundFields {...section} />
        <HelpLanguageFields {...section} />
      </div>
    </details>
  );
}
