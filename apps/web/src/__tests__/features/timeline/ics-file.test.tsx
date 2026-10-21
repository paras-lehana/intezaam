/**
 * Responsibility: the .ics download — the Blob holds exactly core's RFC 5545 calendar with
 * the calendar MIME type, the file name is a safe slug of the plan title, the object URL is
 * revoked after the click, the button announces the saved file, and an undated plan explains
 * instead of saving an empty calendar. Boundary: URL.createObjectURL and the anchor click are
 * stubbed (jsdom has no downloads); the calendar text comes from core.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type Mock, describe, expect, it, vi } from 'vitest';
import { applyPatch, buildPlan } from '@intezaam/core/engine';
import { buildIcs } from '@intezaam/core/export';
import { ICS_BUTTON, IcsDownload } from '../../../components/features/timeline/IcsDownload';
import {
  ICS_MIME,
  REVOKE_DELAY_MS,
  downloadIcs,
  icsBlob,
  icsFileName,
} from '../../../components/features/timeline/ics-file';
import { TEST_TODAY_ISO } from '../../helpers';
import { samplePlan } from '../plan-fixtures';

const { plan, context } = samplePlan('jaipur-wedding');
const OBJECT_URL = 'blob:intezaam-test';

interface DownloadStubs {
  readonly create: Mock<typeof URL.createObjectURL>;
  readonly revoke: Mock<typeof URL.revokeObjectURL>;
}

/** jsdom has no object URLs or downloads: a URL subclass and a silent anchor click stand in. */
function stubDownloads(): DownloadStubs {
  const create = vi.fn<typeof URL.createObjectURL>(() => OBJECT_URL);
  const revoke = vi.fn<typeof URL.revokeObjectURL>();
  class DownloadUrl extends URL {
    static override createObjectURL = create;
    static override revokeObjectURL = revoke;
  }
  vi.stubGlobal('URL', DownloadUrl);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  return { create, revoke };
}

describe('ics file', () => {
  it('names the file after the plan title, safely', () => {
    expect(icsFileName('Jaipur wedding')).toBe('jaipur-wedding.ics');
    expect(icsFileName("Appa's 60th (Shashtiabdapurti)")).toBe('appa-s-60th-shashtiabdapurti.ics');
    expect(icsFileName('॥ ॥')).toBe('intezaam-plan.ics');
  });

  it('wraps core’s calendar in a calendar Blob', async () => {
    const blob = icsBlob(plan);
    expect(blob.type).toBe(ICS_MIME);
    await expect(blob.text()).resolves.toBe(buildIcs(plan, plan.title));
  });

  it('downloads through an object URL and revokes it afterwards', async () => {
    vi.useFakeTimers();
    const { create, revoke } = stubDownloads();
    const name = downloadIcs(plan);
    expect(name).toBe(icsFileName(plan.title));
    expect(create.mock.calls[0]?.[0]).toBeInstanceOf(Blob);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revoke).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(REVOKE_DELAY_MS);
    expect(revoke).toHaveBeenCalledWith(OBJECT_URL);
  });
});

describe('IcsDownload', () => {
  it('announces the saved file', async () => {
    const user = userEvent.setup();
    stubDownloads();
    render(<IcsDownload plan={plan} />);
    await user.click(screen.getByRole('button', { name: ICS_BUTTON }));
    expect(screen.getByRole('status')).toHaveTextContent(icsFileName(plan.title));
  });

  it('explains instead of saving an empty calendar when the date is not fixed', () => {
    const undated = buildPlan(
      applyPatch(context, { ops: [{ op: 'setDateFlexible', value: true }] }),
      TEST_TODAY_ISO,
    );
    expect(undated.ok && undated.value.timeline.mode).toBe('undated');
    if (!undated.ok) return;
    render(<IcsDownload plan={undated.value} />);
    expect(screen.queryByRole('button', { name: ICS_BUTTON })).not.toBeInTheDocument();
    expect(screen.getByText(/Pick a date/)).toBeInTheDocument();
  });
});
