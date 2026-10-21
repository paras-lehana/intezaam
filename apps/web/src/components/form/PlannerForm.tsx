/**
 * The planner form: a brief box, samples, the five essentials and "More details".
 *
 * Responsibility: collect an EventContext and hand it to the page only after it passes
 * `eventContextSchema` — the same contract the server and the engine use. The form opens
 * empty; samples fill but never submit; "Read my brief" passes the text up; an invalid
 * submit scrolls to, focuses and glows the first field to fix, with the reason inline.
 * Boundary: no network and no planning here; the page owns both.
 */
import type { ReactElement } from 'react';
import type { EventContext } from '@intezaam/core/schemas';
import { LiveRegion } from '../ui/LiveRegion';
import { BriefBox } from './BriefBox';
import { BudgetField } from './BudgetField';
import { CityField } from './CityField';
import { DateField } from './DateField';
import { FamilyField } from './FamilyField';
import { FIELD_KEYS, plannerFieldId } from './form-fields';
import { GuestsField } from './GuestsField';
import { MoreDetails } from './MoreDetails';
import { SampleButtons } from './SampleButtons';
import { type PlannerFormFill, usePlannerForm } from './use-planner-form';
import '../../styles/planner-form.css';

export interface PlannerFormProps {
  /** The <form> id; the phone's sticky "Update plan" button submits it via `form=`. */
  readonly formId: string;
  /** The reader's local day (YYYY-MM-DD); samples are dated relative to it. */
  readonly todayIso: string;
  readonly onSubmit: (context: EventContext) => void;
  readonly onReadBrief: (text: string) => void;
  /** Called after an invalid submit (e.g. to switch a phone back to the Details pane). */
  readonly onInvalid?: () => void;
  readonly fill?: PlannerFormFill;
  readonly briefBusy?: boolean;
  readonly briefStatus?: string;
  readonly submitLabel?: string;
}

export const DEFAULT_SUBMIT_LABEL = 'Plan my celebration';

export function PlannerForm({
  formId,
  todayIso,
  onSubmit,
  onReadBrief,
  onInvalid,
  fill,
  briefBusy = false,
  briefStatus = '',
  submitLabel = DEFAULT_SUBMIT_LABEL,
}: PlannerFormProps): ReactElement {
  const form = usePlannerForm({ todayIso, onSubmit, onInvalid, fill });
  const section = {
    state: form.state,
    update: form.update,
    errors: form.errors,
    attention: form.attention,
  };
  const errorCount = FIELD_KEYS.filter((key) => form.errors[key] !== undefined).length;
  const summary =
    errorCount === 0
      ? ''
      : `${errorCount} ${errorCount === 1 ? 'detail needs' : 'details need'} attention before planning.`;

  return (
    <form
      id={formId}
      className="planner-form"
      aria-labelledby={`${formId}-title`}
      noValidate
      onSubmit={form.handleSubmit}
    >
      <h2 id={`${formId}-title`} className="planner-form__title">
        Your celebration
      </h2>
      <BriefBox onReadBrief={onReadBrief} busy={briefBusy} status={briefStatus} />
      <SampleButtons onPick={form.applySample} />
      <fieldset className="essentials">
        <legend className="essentials__legend">Five questions</legend>
        <FamilyField {...section} onFamily={form.chooseFamily} />
        <DateField {...section} />
        <CityField {...section} />
        <GuestsField {...section} />
        <BudgetField {...section} />
      </fieldset>
      <MoreDetails {...section} open={form.detailsOpen} onOpenChange={form.setDetailsOpen} />
      <p id={plannerFieldId('form')} className="planner-form__summary" tabIndex={-1}>
        {form.errors.form ?? ''}
      </p>
      <LiveRegion
        message={summary}
        politeness="assertive"
        visible
        className="planner-form__errors"
      />
      <LiveRegion message={form.announcement} />
      <button type="submit" className="button button--cta button--large planner-form__submit">
        {submitLabel}
      </button>
    </form>
  );
}
