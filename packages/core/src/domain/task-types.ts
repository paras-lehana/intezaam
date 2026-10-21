/**
 * Task templates (TL-01) — the shape every checklist item is written in.
 *
 * Responsibility: the template type, the closed list of conditions a template can depend
 * on, and the factory that fills family defaults. Boundary: types and a builder only;
 * the templates are in the `tasks-*.ts` files and the timeline engine schedules them.
 */
import type { EventFamily, EventKind } from './events.js';
import type { FunctionKind } from './functions.js';
import type { RuleId } from './rule-ids.js';
import type { SourceId } from './sources.js';
import type { Confidence } from './source-types.js';
import type { TimelinePhase } from './timeline.js';
import type { VendorType } from './vendors.js';

/**
 * Facts about the context that switch a template on. The engine evaluates each one; a
 * template without a condition always applies to its families.
 */
export const TASK_CONDITIONS = [
  'date-undecided',
  'hindu-muhurat',
  'nikah',
  'church',
  'gurdwara',
  'planner-hired',
  'jewellery',
  'outstation-guests',
  'rain-risk',
  'accessibility-needs',
  'amplified-sound',
  'public-premises',
  'private-premises',
  'procession',
  'temporary-structure',
  'food-stalls',
  'crowd-over-1000',
  'alcohol',
  'away-from-home',
] as const;

export type TaskCondition = (typeof TASK_CONDITIONS)[number];

export interface TaskTemplate {
  readonly id: string;
  readonly phase: TimelinePhase;
  readonly title: string;
  /** One sentence shown under "Why this?". */
  readonly why: string;
  readonly families: readonly EventFamily[];
  /** Narrows the template to some kinds of the family. */
  readonly kinds?: readonly EventKind[];
  /** Applies only when at least one of these functions is planned. */
  readonly functions?: readonly FunctionKind[];
  readonly condition?: TaskCondition;
  readonly vendorType?: VendorType;
  /** Days before the event it is due (TL-02); negative = days after (TL-11). */
  readonly leadDays: number;
  /** TL-04: with fewer days left than this, the fallback replaces the task. */
  readonly minLeftDays?: number;
  readonly fallbackTitle?: string;
  /** TL-07: template ids that should be done first (ignored when not in the plan). */
  readonly dependsOn: readonly string[];
  /** VER-T: core tasks decide whether the time verdict is on track or compressed. */
  readonly core: boolean;
  readonly ruleId: RuleId;
  readonly sourceId: SourceId;
  readonly confidence: Confidence;
}

/** What a table row must state; everything else falls back to the family defaults. */
export type TaskSpec = Omit<
  TaskTemplate,
  'families' | 'dependsOn' | 'core' | 'ruleId' | 'confidence'
> &
  Partial<Pick<TaskTemplate, 'dependsOn' | 'core' | 'ruleId' | 'confidence'>>;

/**
 * Returns a builder that stamps one family's defaults onto each spec: no dependencies,
 * not core, rule TL-01 and grade C (each row overrides what differs).
 * @example
 * const birthdayTask = taskFactory(['birthday']);
 * birthdayTask({ id: 'b-x', phase: 'decide', title: 'X', why: 'Y', leadDays: 42, sourceId: 'S-GIFTLIST-ND' }).ruleId; // 'TL-01'
 */
export function taskFactory(families: readonly EventFamily[]): (spec: TaskSpec) => TaskTemplate {
  return (spec) => ({
    families,
    dependsOn: [],
    core: false,
    ruleId: 'TL-01',
    confidence: 'C',
    ...spec,
  });
}
