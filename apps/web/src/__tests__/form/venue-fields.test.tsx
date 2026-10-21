/**
 * Responsibility: the venue group sets the setting (rain risk and the outdoor sound rule follow
 * from it), the area and the travelling share as typed, and the destination switch; the venue
 * wrapper glows and both groups show their errors when validation sends the reader there.
 * Boundary: rendered alone in the section harness; labels come from core's venue table and
 * messages from the form's own table.
 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VENUE_SETTING_LABELS } from '@intezaam/core/domain';
import { VenueFields } from '../../components/form/VenueFields';
import { FIELD_MESSAGES, plannerFieldId } from '../../components/form/form-fields';
import { renderSection } from './section-harness';

/** An open lawn of 8,000 sq ft with 30% of guests travelling in (test-owned input). */
const TYPED = { areaSqft: '8000', outstationPct: '30' } as const;

describe('VenueFields', () => {
  it('records the setting, the area, the travelling share and a destination event', async () => {
    const { user, latest } = renderSection(VenueFields);
    await user.click(screen.getByRole('radio', { name: VENUE_SETTING_LABELS.outdoor }));
    await user.type(screen.getByRole('textbox', { name: /Venue area/ }), TYPED.areaSqft);
    const share = screen.getByRole('textbox', { name: 'Share travelling in (%)' });
    await user.clear(share);
    await user.type(share, TYPED.outstationPct);
    await user.click(screen.getByRole('checkbox', { name: /destination event/ }));
    expect(latest()).toMatchObject({ ...TYPED, venueSetting: 'outdoor', destination: true });
  });

  it('stays quiet without errors', () => {
    renderSection(VenueFields);
    expect(document.getElementById(plannerFieldId('venue'))).not.toHaveClass('field--attention');
    expect(screen.queryByText(FIELD_MESSAGES.venue)).not.toBeInTheDocument();
  });

  it('glows on the venue and shows the venue and travel errors', () => {
    renderSection(VenueFields, {
      errors: { venue: FIELD_MESSAGES.venue, travel: FIELD_MESSAGES.travel },
      attention: 'venue',
    });
    expect(document.getElementById(plannerFieldId('venue'))).toHaveClass('field--attention');
    expect(screen.getByRole('group', { name: 'Venue setting' })).toHaveAccessibleDescription(
      FIELD_MESSAGES.venue,
    );
    expect(screen.getByRole('group', { name: 'Guests from out of town' })).toHaveAccessibleDescription(
      FIELD_MESSAGES.travel,
    );
  });
});
