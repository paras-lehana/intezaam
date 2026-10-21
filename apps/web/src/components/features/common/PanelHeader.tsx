/**
 * The top of a workspace panel: its h2 and one line on what the tab answers.
 *
 * Responsibility: a consistent heading level (h2 per tab, h3 per section, h4 per item) so
 * screen-reader users can jump between tabs' content by heading. Boundary: layout only.
 */
import type { ReactElement, ReactNode } from 'react';

export interface PanelHeaderProps {
  readonly title: string;
  readonly children: ReactNode;
}

export function PanelHeader({ title, children }: PanelHeaderProps): ReactElement {
  return (
    <header className="panel-header">
      <h2 className="panel-header__title">{title}</h2>
      <p className="panel-header__lede">{children}</p>
    </header>
  );
}
