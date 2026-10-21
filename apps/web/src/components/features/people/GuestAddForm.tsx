/**
 * Adds one party (a family or a single guest) to the browser-only guest list.
 *
 * Responsibility: a labelled form — name, adults, children, side (weddings), diet and RSVP —
 * with an inline error (role="alert") when the name is missing; the button is never
 * disabled. Boundary: hands the new party to the list; nothing is sent anywhere.
 */
import { type FormEvent, type ReactElement, useState } from 'react';
import { MAX_LABEL_CHARS } from '@intezaam/core/schemas';
import { MAX_PARTY_SIZE } from './guest-csv';
import {
  GUEST_DIETS,
  GUEST_DIET_LABELS,
  GUEST_SIDES,
  GUEST_SIDE_LABELS,
  GUEST_STATUSES,
  GUEST_STATUS_LABELS,
  pickOption,
} from './guest-rules';
import type { NewGuest } from './use-guest-list';
import { LabelledSelect } from './LabelledSelect';

export interface GuestAddFormProps {
  /** Weddings ask which side a guest is from. */
  readonly withSides: boolean;
  readonly onAdd: (guest: NewGuest) => void;
}

/** Party sizes the pickers offer: 0–20 covers a joint family; imports allow up to 99. */
const PARTY_CHOICES = 20;

function partyOptions(min: number): { value: string; label: string }[] {
  return Array.from({ length: PARTY_CHOICES - min + 1 }, (_, index) => {
    const value = String(index + min);
    return { value, label: value };
  });
}

function party(value: string): number {
  return Math.min(MAX_PARTY_SIZE, Math.max(0, Number.parseInt(value, 10) || 0));
}

const ADULT_OPTIONS = partyOptions(1);
const KID_OPTIONS = partyOptions(0);

export function GuestAddForm({ withSides, onAdd }: GuestAddFormProps): ReactElement {
  const [name, setName] = useState('');
  const [adults, setAdults] = useState('1');
  const [kids, setKids] = useState('0');
  const [side, setSide] = useState('both');
  const [diet, setDiet] = useState('veg');
  const [status, setStatus] = useState('invited');
  const [error, setError] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (name.trim() === '') {
      setError('Add the guest’s or family’s name.');
      return;
    }
    onAdd({
      name: name.trim(),
      adults: party(adults),
      kids: party(kids),
      side: pickOption(GUEST_SIDES, side, 'both'),
      diet: pickOption(GUEST_DIETS, diet, 'veg'),
      status: pickOption(GUEST_STATUSES, status, 'invited'),
    });
    setName('');
    setError('');
  }

  return (
    <form className="guest-form" noValidate onSubmit={handleSubmit}>
      <div className="field guest-form__name">
        <label htmlFor="guest-name">Name or family</label>
        <input
          id="guest-name"
          type="text"
          autoComplete="off"
          value={name}
          maxLength={MAX_LABEL_CHARS}
          placeholder="Sharma ji (family)"
          aria-invalid={error !== ''}
          aria-describedby={error === '' ? undefined : 'guest-name-error'}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <LabelledSelect
        id="guest-adults"
        label="Adults"
        value={adults}
        options={ADULT_OPTIONS}
        onChange={setAdults}
      />
      <LabelledSelect
        id="guest-kids"
        label="Children"
        value={kids}
        options={KID_OPTIONS}
        onChange={setKids}
      />
      {withSides ? (
        <LabelledSelect
          id="guest-side"
          label="Side"
          value={side}
          options={GUEST_SIDES.map((value) => ({ value, label: GUEST_SIDE_LABELS[value] }))}
          onChange={setSide}
        />
      ) : null}
      <LabelledSelect
        id="guest-diet"
        label="Food"
        value={diet}
        options={GUEST_DIETS.map((value) => ({ value, label: GUEST_DIET_LABELS[value] }))}
        onChange={setDiet}
      />
      <LabelledSelect
        id="guest-status"
        label="RSVP"
        value={status}
        options={GUEST_STATUSES.map((value) => ({ value, label: GUEST_STATUS_LABELS[value] }))}
        onChange={setStatus}
      />
      <button type="submit" className="button button--secondary">
        Add to the list
      </button>
      {error === '' ? null : (
        <p id="guest-name-error" className="field__error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
