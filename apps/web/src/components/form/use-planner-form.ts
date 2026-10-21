/**
 * The planner form's behaviour: state, fills, samples, validation and the error moment.
 *
 * Responsibility: own the form state; apply fills from outside (a read brief, an applied
 * change) and from the sample buttons — which fill but never submit; validate on submit
 * and live afterwards; and on an invalid submit open "More details" when needed, then
 * scroll the first invalid field into view, focus it and let it glow (no alert boxes).
 * Boundary: no markup; PlannerForm renders what this returns.
 */
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  type EventFamily,
  type SampleId,
  functionAllowedFor,
  kindsOfFamily,
  SAMPLE_CONTEXTS,
  sampleContext,
} from '@intezaam/core/domain';
import type { EventContext } from '@intezaam/core/schemas';
import { prefersReducedMotion } from '../ui/use-media-query';
import { DETAIL_FIELDS, type FieldErrors, type FieldKey, plannerFieldId } from './form-fields';
import { EMPTY_FORM_STATE, fillState, type PlannerFormState } from './form-state';
import { firstInvalidField, validatePlannerForm } from './form-validation';

/** A fill requested by the page; change `id` to apply the same kind of fill again. */
export interface PlannerFormFill {
  readonly id: number;
  readonly context: Partial<EventContext>;
  /** True for a whole context (sample, applied change); false for a partial one (a brief). */
  readonly complete: boolean;
}

export interface PlannerFormOptions {
  readonly todayIso: string;
  readonly onSubmit: (context: EventContext) => void;
  readonly onInvalid?: (() => void) | undefined;
  readonly fill?: PlannerFormFill | undefined;
}

/** The field to glow; a fresh object per submit re-runs the focus effect for the same field. */
interface Attention {
  readonly field: FieldKey;
}

/** The glow lasts as long as its CSS animation (tokens.css --duration-glow). */
export const ATTENTION_MS = 3000;

const FOCUSABLE = 'input, select, textarea, button, [tabindex]';
const NO_ERRORS: FieldErrors = {};

export interface PlannerFormApi {
  readonly state: PlannerFormState;
  readonly errors: FieldErrors;
  readonly attention: FieldKey | null;
  readonly detailsOpen: boolean;
  readonly announcement: string;
  readonly update: (patch: Partial<PlannerFormState>) => void;
  readonly chooseFamily: (family: EventFamily) => void;
  readonly applySample: (id: SampleId) => void;
  readonly setDetailsOpen: (open: boolean) => void;
  readonly handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function focusField(field: FieldKey): void {
  const container = document.getElementById(plannerFieldId(field));
  const target = container?.querySelector<HTMLElement>(FOCUSABLE) ?? container;
  if (target === null) return;
  // scrollIntoView is missing in some engines (and in jsdom); focus still works without it.
  if (typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({
      block: 'center',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }
  target.focus({ preventScroll: true });
}

/**
 * The planner form's state machine.
 * @example
 * const form = usePlannerForm({ todayIso: '2026-10-20', onSubmit: setContext });
 */
export function usePlannerForm({
  todayIso,
  onSubmit,
  onInvalid,
  fill,
}: PlannerFormOptions): PlannerFormApi {
  const [state, setState] = useState<PlannerFormState>(EMPTY_FORM_STATE);
  const [submitted, setSubmitted] = useState(false);
  const [attention, setAttention] = useState<Attention | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [appliedFillId, setAppliedFillId] = useState<number | null>(null);

  // Adjusting state while rendering (React's documented pattern): a new fill from the page
  // must show in this same render, without an effect and a second paint.
  if (fill !== undefined && fill.id !== appliedFillId) {
    setAppliedFillId(fill.id);
    setState((current) => fillState(current, fill.context, fill.complete));
  }

  // Efficiency: validation reruns only when the state object changes.
  const validation = useMemo(() => validatePlannerForm(state), [state]);
  const errors = submitted && !validation.ok ? validation.errors : NO_ERRORS;

  useEffect(() => {
    if (attention === null) return undefined;
    focusField(attention.field);
    const timer = window.setTimeout(() => setAttention(null), ATTENTION_MS);
    return () => window.clearTimeout(timer);
  }, [attention]);

  function update(patch: Partial<PlannerFormState>): void {
    setState((current) => ({ ...current, ...patch }));
  }

  function chooseFamily(family: EventFamily): void {
    setState((current) =>
      current.family === family
        ? current
        : {
            ...current,
            family,
            kind: kindsOfFamily(family)[0] ?? '',
            // Functions belong to a family (a sangeet is not a birthday function).
            functions: current.functions.filter((kind) => functionAllowedFor(kind, family)),
          },
    );
  }

  function applySample(id: SampleId): void {
    setState(fillState(EMPTY_FORM_STATE, sampleContext(id, todayIso), true));
    setSubmitted(false);
    setAnnouncement(
      `Filled with the sample: ${SAMPLE_CONTEXTS[id].label}. Check the details, then make the plan.`,
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSubmitted(true);
    if (validation.ok) {
      setAnnouncement('');
      onSubmit(validation.context);
      return;
    }
    const first = firstInvalidField(validation.errors) ?? 'form';
    if (DETAIL_FIELDS.has(first)) setDetailsOpen(true);
    setAttention({ field: first });
    onInvalid?.();
  }

  return {
    state,
    errors,
    attention: attention?.field ?? null,
    detailsOpen,
    announcement,
    update,
    chooseFamily,
    applySample,
    setDetailsOpen,
    handleSubmit,
  };
}
