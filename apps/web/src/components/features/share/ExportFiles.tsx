/**
 * Google Sheets, calendar and paper: the plan's files and the print view.
 *
 * Responsibility: one button per CSV table (budget, checklist, vendors — formula-injection
 * safe, ready for Google Sheets), the whole timeline as an .ics calendar file, and Print,
 * which uses the print stylesheet (chrome hidden, ink on white). Boundary: files are made
 * and saved in the browser; nothing is uploaded.
 */
import type { ReactElement } from 'react';
import { CSV_TABLES } from '@intezaam/core/export';
import type { Plan } from '@intezaam/core/schemas';
import { PanelSection } from '../common/PanelSection';
import { downloadText } from './download';
import { CSV_LABELS, type ExportFile, csvExport, icsExport } from './share-files';

export interface ExportFilesProps {
  readonly plan: Plan;
}

function save(file: ExportFile): void {
  downloadText(file.fileName, file.text, file.kind);
}

export function ExportFiles({ plan }: ExportFilesProps): ReactElement {
  return (
    <PanelSection
      id="share-files"
      title="Sheets, calendar and print"
      lede="Open the CSV files in Google Sheets (File → Import) and the .ics file in Google Calendar. Print gives a clean paper copy of the open tab."
    >
      <div className="share-actions">
        {CSV_TABLES.map((table) => (
          <button
            key={table}
            type="button"
            className="button button--secondary"
            onClick={() => save(csvExport(plan, table))}
          >
            {CSV_LABELS[table]} (CSV)
          </button>
        ))}
        <button
          type="button"
          className="button button--secondary"
          onClick={() => save(icsExport(plan))}
        >
          Calendar (.ics)
        </button>
        <button type="button" className="button button--secondary" onClick={() => window.print()}>
          Print or save a PDF
        </button>
      </div>
    </PanelSection>
  );
}
