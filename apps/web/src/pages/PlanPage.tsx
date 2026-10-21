/**
 * The planner page: the details form beside the plan workspace.
 *
 * Responsibility: wire the form, the brief reader and the plan state together — a submit
 * builds the plan in the browser at once (narration follows), switches a phone to the
 * Plan pane and moves focus to the plan heading; a read brief is reviewed before it fills
 * the form; a change from a lever, What if or Ask re-plans and shows in the form; every
 * new plan is announced politely. Boundary: layout comes from PlanSplit (form left,
 * workspace right on desktop; a "Details | Plan" switch and sticky "Update plan" bar on
 * phones); planning logic lives in lib/use-plan-state.ts.
 */
import { type ReactElement, useEffect, useState } from 'react';
import type { ContextPatch, EventContext } from '@intezaam/core/schemas';
import { BriefReview } from '../components/features/workspace/BriefReview';
import { draftToFill } from '../components/features/workspace/brief-fill';
import { EmptyWorkspace } from '../components/features/workspace/EmptyWorkspace';
import { Workspace } from '../components/features/workspace/Workspace';
import { DEFAULT_SUBMIT_LABEL, PlannerForm, type PlannerFormFill } from '../components/form';
import { PlanSplit } from '../components/layout/PlanSplit';
import type { SplitView } from '../components/layout/SplitSwitch';
import { LiveRegion } from '../components/ui/LiveRegion';
import { PageHero } from '../components/ui/PageHero';
import { PLAN_HEADING_ID, browserToday, planAnnouncement } from '../lib/plan-state';
import { useBriefReader } from '../lib/use-brief-reader';
import { usePlanState } from '../lib/use-plan-state';
import { CANONICAL_PATHS, useCanonical } from '../lib/use-canonical';
import { usePageTitle } from '../lib/use-page-title';

export const PLAN_TITLE = 'Plan your celebration';
export const UPDATE_LABEL = 'Update plan';
export const PLANNER_FORM_ID = 'planner';

export function PlanPage(): ReactElement {
  usePageTitle(PLAN_TITLE);
  useCanonical(CANONICAL_PATHS.plan);
  const [todayIso] = useState(browserToday);
  const planner = usePlanState(todayIso);
  const brief = useBriefReader(todayIso);
  const { state } = planner;
  const { plan, context } = state;
  const [view, setView] = useState<SplitView>(plan === undefined ? 'details' : 'plan');
  const [fill, setFill] = useState<PlannerFormFill | undefined>(() =>
    context === undefined ? undefined : { id: 1, context, complete: true },
  );

  // A plan built from the form or restored takes focus; after a change, only if the
  // control that asked for it disappeared (focus fell back to the page).
  useEffect(() => {
    if (state.version === 0 || state.origin === 'link') return;
    const active = document.activeElement;
    if (state.origin === 'patch' && active !== null && active !== document.body) return;
    document.getElementById(PLAN_HEADING_ID)?.focus();
  }, [state.version, state.origin]);

  function showInForm(next: Partial<EventContext>, complete: boolean): void {
    setFill((previous) => ({ id: (previous?.id ?? 0) + 1, context: next, complete }));
  }

  function submit(next: EventContext): void {
    if (planner.submit(next)) setView('plan');
  }

  function applyPatch(patch: ContextPatch): void {
    const next = planner.applyPatch(patch);
    if (next !== undefined) showInForm(next, true);
  }

  function continueLast(): void {
    const restored = planner.restoreLast();
    if (restored === undefined) return;
    showInForm(restored, true);
    setView('plan');
  }

  function confirmBrief(): void {
    const draft = brief.confirm();
    if (draft !== undefined) showInForm(draftToFill(draft), false);
  }

  const workspace =
    plan === undefined || context === undefined ? (
      <EmptyWorkspace lastContext={planner.lastContext} onContinue={continueLast} />
    ) : (
      <Workspace
        plan={plan}
        context={context}
        todayIso={todayIso}
        onApplyPatch={applyPatch}
        narration={state.narration}
        narrationState={state.narrationState}
        provenance={state.provenance}
        hinglish={brief.hinglish}
      />
    );

  return (
    <div className="plan-page">
      <div className="container plan-page__intro">
        <PageHero eyebrow="Planner" title={PLAN_TITLE}>
          Describe the celebration in your words or answer five questions. Tested rules make the
          plan; Gemini explains it.
        </PageHero>
      </div>
      <PlanSplit
        view={view}
        onViewChange={setView}
        formId={PLANNER_FORM_ID}
        planReady={plan !== undefined}
        actionLabel={plan === undefined ? DEFAULT_SUBMIT_LABEL : UPDATE_LABEL}
        details={
          <>
            {brief.review === undefined ? null : (
              <BriefReview
                review={brief.review}
                onConfirm={confirmBrief}
                onDismiss={brief.dismiss}
              />
            )}
            <PlannerForm
              formId={PLANNER_FORM_ID}
              todayIso={todayIso}
              onSubmit={submit}
              onReadBrief={brief.read}
              onInvalid={() => setView('details')}
              {...(fill === undefined ? {} : { fill })}
              briefBusy={brief.busy}
              briefStatus={brief.status}
              submitLabel={plan === undefined ? DEFAULT_SUBMIT_LABEL : UPDATE_LABEL}
            />
          </>
        }
        workspace={
          <>
            {state.error === undefined ? null : (
              <p className="notice notice--error" role="alert">
                {state.error}
              </p>
            )}
            {workspace}
          </>
        }
      />
      <LiveRegion message={plan === undefined ? '' : planAnnouncement(plan, state.origin)} />
    </div>
  );
}
