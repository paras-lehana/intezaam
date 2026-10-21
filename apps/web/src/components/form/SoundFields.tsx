/**
 * Sound and fireworks: amplified music, when it stops, a silence zone nearby, crackers.
 *
 * Responsibility: the inputs behind the noise rules — loudspeakers and DJs must stop at
 * 10 pm outdoors (Noise Rules 2000), silence zones near hospitals, schools and courts are
 * stricter, and crackers have their own permitted slots. Boundary: optional; with nothing
 * ticked the plan has no sound section.
 */
import type { ReactElement } from 'react';
import { FieldShell } from './FieldShell';
import { GroupShell } from './GroupShell';
import type { SectionProps } from './form-fields';
import type { SoundState } from './form-state';

/** The yes/no parts of the sound plan, in reading order. */
const SOUND_CHECKS: readonly {
  readonly key: Exclude<keyof SoundState, 'endHhmm'>;
  readonly label: string;
}[] = [
  { key: 'amplified', label: 'Amplified music (DJ, band or loudspeaker)' },
  { key: 'nearSilenceZone', label: 'Near a hospital, school or court' },
  { key: 'crackers', label: 'Crackers or fireworks' },
];

export function SoundFields({ state, update, errors, attention }: SectionProps): ReactElement {
  const { sound } = state;
  return (
    <GroupShell
      field="sound"
      legend="Music and fireworks"
      hint="Outdoor amplified sound must stop by 10 pm unless a festival exemption applies."
      error={errors.sound}
      attention={attention === 'sound'}
    >
      {SOUND_CHECKS.map(({ key, label }) => (
        <label key={key} className="check">
          <input
            type="checkbox"
            checked={sound[key]}
            onChange={(event) => update({ sound: { ...sound, [key]: event.target.checked } })}
          />
          <span>{label}</span>
        </label>
      ))}
      {sound.amplified ? (
        <FieldShell
          inputId="planner-sound-end"
          label="Music stops at"
          renderControl={(a11y) => (
            <input
              {...a11y}
              type="time"
              value={sound.endHhmm}
              onChange={(event) => update({ sound: { ...sound, endHhmm: event.target.value } })}
            />
          )}
        />
      ) : null}
    </GroupShell>
  );
}
