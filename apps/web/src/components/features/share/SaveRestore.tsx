/**
 * Save and restore: the plan's inputs as a file on this device, and back again.
 *
 * Responsibility: save the event context as a small JSON file; restore one by reading it in
 * the browser, validating every field (size cap, guarded parse, the full context schema)
 * and reopening the planner on that plan's link. Boundary: files never leave the device;
 * a file that fails validation is refused with a message and nothing changes.
 */
import { type ChangeEvent, type ReactElement, useState } from 'react';
import type { EventContext } from '@intezaam/core/schemas';
import { readPickedText } from '../../../lib/read-picked-text';
import { PanelSection } from '../common/PanelSection';
import { downloadText } from './download';
import {
  MAX_PLAN_FILE_BYTES,
  NOT_A_PLAN_FILE,
  planFile,
  readPlanFile,
  shareLink,
} from './share-files';

export interface SaveRestoreProps {
  readonly context: EventContext;
  readonly title: string;
  /** Opens a plan link; the default reloads the planner on it (tests pass a stand-in). */
  readonly openLink?: (url: string) => void;
}

/** The planner reads a `#plan=` link when it loads, so restoring reloads on the link. */
function reloadOn(url: string): void {
  window.location.assign(url);
  window.location.reload();
}

export function SaveRestore({
  context,
  title,
  openLink = reloadOn,
}: SaveRestoreProps): ReactElement {
  const [error, setError] = useState('');

  async function restore(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const picked = await readPickedText(event.currentTarget, MAX_PLAN_FILE_BYTES);
    if (picked.kind === 'none') return;
    // An oversized or unreadable file (moved, locked, permission revoked) is simply not a plan file.
    if (picked.kind !== 'text') {
      setError(NOT_A_PLAN_FILE);
      return;
    }
    const read = readPlanFile(picked.text);
    if (!read.ok) {
      setError(read.error);
      return;
    }
    setError('');
    openLink(shareLink(read.value, window.location.href));
  }

  const saved = planFile(context, title);
  return (
    <PanelSection
      id="share-save"
      title="Save and restore"
      lede="Keep the plan's details as a file on this device and open it again later."
    >
      <button
        type="button"
        className="button button--secondary"
        onClick={() => downloadText(saved.fileName, saved.text, saved.kind)}
      >
        Save the plan (file)
      </button>
      <div className="field">
        <label htmlFor="share-restore">Restore a saved plan</label>
        <input
          id="share-restore"
          type="file"
          accept=".json,application/json"
          onChange={(event) => void restore(event)}
        />
      </div>
      {error === '' ? null : (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
    </PanelSection>
  );
}
