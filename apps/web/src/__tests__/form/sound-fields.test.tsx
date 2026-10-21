/**
 * Responsibility: the sound group asks when the music stops only once amplified music is
 * ticked, records that time and the silence-zone and crackers answers, and hides the time
 * again when the music is unticked. Boundary: rendered alone in the section harness; the
 * starting time is the form's own default (the 10 pm Noise Rules cut-off).
 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SoundFields } from '../../components/form/SoundFields';
import { EMPTY_FORM_STATE } from '../../components/form/form-state';
import { renderSection } from './section-harness';

/** Music that stops half an hour before the cut-off (test-owned input). */
const END = '21:30';
const END_LABEL = 'Music stops at';

describe('SoundFields', () => {
  it('asks for the stop time only while amplified music is ticked', async () => {
    const { user } = renderSection(SoundFields);
    const amplified = screen.getByRole('checkbox', { name: /Amplified music/ });
    expect(screen.queryByLabelText(END_LABEL)).not.toBeInTheDocument();
    await user.click(amplified);
    expect(screen.getByLabelText(END_LABEL)).toHaveValue(EMPTY_FORM_STATE.sound.endHhmm);
    await user.click(amplified);
    expect(screen.queryByLabelText(END_LABEL)).not.toBeInTheDocument();
  });

  it('records the stop time, a nearby silence zone and crackers', async () => {
    const { user, latest } = renderSection(SoundFields, {
      start: { sound: { ...EMPTY_FORM_STATE.sound, amplified: true } },
    });
    const end = screen.getByLabelText(END_LABEL);
    await user.clear(end);
    await user.type(end, END);
    await user.click(screen.getByRole('checkbox', { name: /hospital, school or court/ }));
    await user.click(screen.getByRole('checkbox', { name: /Crackers/ }));
    expect(latest().sound).toEqual({
      amplified: true,
      endHhmm: END,
      nearSilenceZone: true,
      crackers: true,
    });
  });
});
