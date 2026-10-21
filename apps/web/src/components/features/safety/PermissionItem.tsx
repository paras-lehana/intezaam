/**
 * One permission on the checklist: what it is, who grants it, when, and the sources.
 *
 * Responsibility: a real labelled checkbox to tick it off, its status in words ("Must fix",
 * "Needed", "Check if this applies"), the authority, the timing, the plan's note, the
 * published sources and "Why this?". Boundary: display and a local tick; permissions are
 * the engine's (PERM-01…08) and the authority is always "verify locally".
 */
import type { ReactElement } from 'react';
import { VERIFY_LOCALLY_NOTE } from '@intezaam/core/domain';
import type { Permission, Plan } from '@intezaam/core/schemas';
import { SeverityLabel } from '../common/SeverityLabel';
import { SourceLinks } from '../common/SourceLinks';
import { TraceDisclosure } from '../common/TraceDisclosure';
import { sourcesFor } from '../common/trace-lookup';

export interface PermissionItemProps {
  readonly plan: Plan;
  readonly permission: Permission;
  readonly done: boolean;
  readonly onToggle: (id: string) => void;
}

/** The note without the standing "verify locally" line, which the checklist shows once. */
function ownNote(note: string): string {
  return note.replace(VERIFY_LOCALLY_NOTE, '').trim();
}

export function PermissionItem({
  plan,
  permission,
  done,
  onToggle,
}: PermissionItemProps): ReactElement {
  const checkId = `permission-${permission.id}`;
  const note = ownNote(permission.note);
  return (
    <li className={`permission edge-card${permission.blocker ? ' permission--blocker' : ''}`}>
      <div className="permission__head">
        <input
          id={checkId}
          type="checkbox"
          checked={done}
          onChange={() => onToggle(permission.id)}
        />
        <label htmlFor={checkId} className="permission__title">
          {permission.title}
        </label>
        {permission.blocker ? (
          <SeverityLabel severity="blocker" />
        ) : (
          <span className="chip">{permission.required ? 'Needed' : 'Check if this applies'}</span>
        )}
      </div>
      <dl className="permission__facts">
        <div>
          <dt>Who grants it</dt>
          <dd>{permission.authority}</dd>
        </div>
        <div>
          <dt>When</dt>
          <dd>{permission.when}</dd>
        </div>
      </dl>
      {note === '' ? null : <p className="permission__note">{note}</p>}
      <SourceLinks sources={sourcesFor(plan, permission.sourceIds)} />
      <TraceDisclosure plan={plan} traceIds={permission.traceIds} subject={permission.title} />
    </li>
  );
}
