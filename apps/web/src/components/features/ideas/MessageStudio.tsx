/**
 * Invitation and message studio (feature #31): kind × language × tone → a drafted message.
 *
 * Responsibility: labelled pickers for the message kind (invitation, RSVP reminder, vendor
 * enquiry, volunteer brief, thank-you, plan summary), one of 11 languages, warm or formal,
 * the vendor for an enquiry and an optional host name; "Write the message" asks the server
 * (Gemini, or its offline templates) and shows the result ready to send. Boundary: numbers
 * and dates in a draft come from the plan the server recomputes; no guest data is sent.
 */
import { type FormEvent, type ReactElement, useState } from 'react';
import { LANGUAGE_CODES, type VendorType, languageLabel } from '@intezaam/core/domain';
import {
  DRAFT_KINDS,
  DRAFT_TONES,
  type EventContext,
  MAX_HOST_NAME_CHARS,
  type Plan,
} from '@intezaam/core/schemas';
import { ChoiceGroup } from '../../ui/ChoiceGroup';
import { PanelSection } from '../common/PanelSection';
import { pickOption } from '../people/guest-rules';
import { LabelledSelect } from '../people/LabelledSelect';
import { DraftResult } from './DraftResult';
import {
  DRAFT_KIND_LABELS,
  DRAFT_TONE_LABELS,
  type DraftKind,
  type DraftTone,
} from './idea-labels';
import { studioRequest } from './studio-request';
import { useDraft } from './use-draft';

export interface MessageStudioProps {
  readonly plan: Plan;
  readonly context: EventContext;
  readonly todayIso: string;
  /** The brief was Hinglish: an English draft comes back in Hinglish too. */
  readonly hinglish?: boolean | undefined;
}

const KIND_OPTIONS = DRAFT_KINDS.map((value) => ({ value, label: DRAFT_KIND_LABELS[value] }));
const LANGUAGE_OPTIONS = LANGUAGE_CODES.map((value) => ({ value, label: languageLabel(value) }));
const TONE_OPTIONS = DRAFT_TONES.map((value) => ({ value, label: DRAFT_TONE_LABELS[value] }));

export function MessageStudio(props: MessageStudioProps): ReactElement {
  const { plan, context, todayIso, hinglish } = props;
  const [kind, setKind] = useState<DraftKind>('invitation');
  const [language, setLanguage] = useState(context.language);
  const [tone, setTone] = useState<DraftTone>('warm');
  const [vendor, setVendor] = useState<VendorType | ''>(plan.vendors[0]?.vendorType ?? '');
  const [host, setHost] = useState('');
  // The language the shown draft was written in (the picker may have moved on since).
  const [draftLanguage, setDraftLanguage] = useState(context.language);
  const studio = useDraft();
  const vendorOptions = plan.vendors.map((entry) => ({
    value: entry.vendorType,
    label: entry.label,
  }));

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setDraftLanguage(language);
    void studio.request(
      studioRequest({ context, todayIso, kind, language, tone, vendor, host, hinglish }),
    );
  }

  return (
    <PanelSection
      id="ideas-messages"
      title="Invitations and messages"
      lede="Drafted in your language from the plan’s own facts — read it, change it, then send it yourself."
    >
      <form className="studio" noValidate onSubmit={handleSubmit}>
        <LabelledSelect
          id="studio-kind"
          label="Message"
          value={kind}
          options={KIND_OPTIONS}
          onChange={(value) => setKind(pickOption(DRAFT_KINDS, value, kind))}
        />
        <LabelledSelect
          id="studio-language"
          label="Language"
          value={language}
          options={LANGUAGE_OPTIONS}
          onChange={(value) => setLanguage(pickOption(LANGUAGE_CODES, value, language))}
        />
        {kind === 'vendor-enquiry' && vendorOptions.length > 0 ? (
          <LabelledSelect
            id="studio-vendor"
            label="Vendor"
            value={vendor}
            options={vendorOptions}
            onChange={(value) =>
              setVendor(vendorOptions.find((option) => option.value === value)?.value ?? '')
            }
          />
        ) : null}
        <ChoiceGroup
          legend="Tone"
          name="studio-tone"
          variant="chips"
          options={TONE_OPTIONS}
          value={tone}
          onChange={setTone}
        />
        <div className="field">
          <label htmlFor="studio-host">Sign it from (optional)</label>
          <input
            id="studio-host"
            type="text"
            value={host}
            maxLength={MAX_HOST_NAME_CHARS}
            placeholder="The Sharma family"
            onChange={(event) => setHost(event.target.value)}
          />
        </div>
        <button
          type="submit"
          className="button button--cta"
          aria-disabled={studio.busy}
          aria-busy={studio.busy}
        >
          {studio.busy ? 'Writing…' : 'Write the message'}
        </button>
      </form>
      {studio.error === '' ? null : (
        <p className="field__error" role="alert">
          {studio.error}
        </p>
      )}
      <div aria-live="polite">
        {studio.draft === undefined ? null : (
          <DraftResult
            draft={studio.draft}
            language={draftLanguage}
            fallbackSubject={DRAFT_KIND_LABELS[kind]}
          />
        )}
      </div>
    </PanelSection>
  );
}
