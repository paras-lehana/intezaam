/**
 * Responsibility: the Share tab — the WhatsApp summary is core's share text in a wa.me link,
 * each CSV and the .ics download carry core's own export, Print opens the print view, the
 * share link carries the context, and save/restore writes a plan file and reopens only a
 * valid one. Boundary: downloads and navigation are captured; builders are core's.
 */
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CSV_TABLES, buildIcs, buildShareText, planToCsv } from '@intezaam/core/export';
import { buildWhatsAppUrl } from '@intezaam/core/integrations';
import { eventContextSchema } from '@intezaam/core/schemas';
import {
  CSV_LABELS,
  MAX_PLAN_FILE_BYTES,
  NOT_A_PLAN_FILE,
  planFile,
  shareLink,
} from '../../../components/features/share/share-files';
import { SaveRestore } from '../../../components/features/share/SaveRestore';
import { SharePanel } from '../../../components/features/share/SharePanel';
import { captureDownloads, samplePanel } from '../panel-fixtures';

describe('SharePanel', () => {
  it('shares core’s summary on WhatsApp', () => {
    const { plan, props } = samplePanel('jaipur-wedding');
    render(<SharePanel {...props} />);
    const text = buildShareText(plan, plan.title);
    expect(screen.getByLabelText('Summary text')).toHaveTextContent(plan.title);
    expect(screen.getByRole('link', { name: /Share on WhatsApp/ })).toHaveAttribute(
      'href',
      buildWhatsAppUrl(text),
    );
  });

  it('downloads core’s CSV tables and calendar file', async () => {
    const user = userEvent.setup();
    const { plan, props } = samplePanel('society-ganesh');
    const capture = captureDownloads();
    render(<SharePanel {...props} />);
    for (const table of CSV_TABLES) {
      await user.click(screen.getByRole('button', { name: `${CSV_LABELS[table]} (CSV)` }));
    }
    await user.click(screen.getByRole('button', { name: 'Calendar (.ics)' }));
    const texts = await Promise.all(capture.files.map((file) => file.text()));
    expect(texts).toEqual([
      ...CSV_TABLES.map((table) => planToCsv(plan, table)),
      buildIcs(plan, plan.title),
    ]);
    expect(capture.files.map((file) => file.fileName.split('.').pop())).toEqual([
      'csv',
      'csv',
      'csv',
      'ics',
    ]);
  });

  it('opens the print view', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    render(<SharePanel {...samplePanel('bengaluru-birthday').props} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Print or save a PDF' }));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it('shows a link that carries this plan, and saves the plan as a file', async () => {
    const user = userEvent.setup();
    const { context, plan, props } = samplePanel('bengaluru-birthday');
    const capture = captureDownloads();
    render(<SharePanel {...props} />);
    const link = screen.getByLabelText('Link to this plan');
    if (!(link instanceof HTMLInputElement)) throw new Error('the link is shown in a text input');
    expect(link).toHaveValue(shareLink(context, window.location.href));
    act(() => link.focus());
    expect([link.selectionStart, link.selectionEnd]).toEqual([0, link.value.length]);
    await user.click(screen.getByRole('button', { name: 'Save the plan (file)' }));
    const saved = planFile(context, plan.title);
    expect(capture.files[0]?.fileName).toBe(saved.fileName);
    expect(await capture.files[0]?.text()).toBe(saved.text);
  });
});

describe('SaveRestore', () => {
  it('reopens the planner on a valid saved plan', async () => {
    const { context, plan } = samplePanel('society-ganesh');
    const openLink = vi.fn<(url: string) => void>();
    render(<SaveRestore context={context} title={plan.title} openLink={openLink} />);
    const saved = planFile(context, plan.title);
    const file = new File([saved.text], saved.fileName, { type: 'application/json' });
    await userEvent.setup().upload(screen.getByLabelText('Restore a saved plan'), file);
    // The link is built from the validated context the file was read into.
    expect(openLink).toHaveBeenCalledWith(
      shareLink(eventContextSchema.parse(context), window.location.href),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('refuses a file larger than any saved plan', async () => {
    const { context, plan } = samplePanel('society-ganesh');
    const openLink = vi.fn<(url: string) => void>();
    render(<SaveRestore context={context} title={plan.title} openLink={openLink} />);
    const file = new File(['x'.repeat(MAX_PLAN_FILE_BYTES + 1)], 'huge.json', {
      type: 'application/json',
    });
    await userEvent.setup().upload(screen.getByLabelText('Restore a saved plan'), file);
    expect(screen.getByRole('alert')).toHaveTextContent(NOT_A_PLAN_FILE);
    expect(openLink).not.toHaveBeenCalled();
  });

  it('refuses a file that is not a saved plan and changes nothing', async () => {
    const { context, plan } = samplePanel('society-ganesh');
    const openLink = vi.fn<(url: string) => void>();
    render(<SaveRestore context={context} title={plan.title} openLink={openLink} />);
    const file = new File(['{"hello":"world"}'], 'other.json', { type: 'application/json' });
    await userEvent.setup().upload(screen.getByLabelText('Restore a saved plan'), file);
    expect(screen.getByRole('alert')).toHaveTextContent(NOT_A_PLAN_FILE);
    expect(openLink).not.toHaveBeenCalled();
  });
});
