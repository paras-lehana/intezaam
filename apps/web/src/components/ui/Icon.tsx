/**
 * Line icons drawn from one path table (24 × 24 grid, stroke in currentColor).
 *
 * Responsibility: consistent, theme-aware pictograms for feature groups, buttons and
 * badges without an icon font or external sprite (the CSP allows only same-origin
 * assets). Boundary: always decorative — the text beside an icon carries its meaning.
 */
import type { ReactElement } from 'react';

const ICON_PATHS = {
  wallet:
    'M4 7.5A1.5 1.5 0 0 1 5.5 6H18a1 1 0 0 1 1 1v2M4 7.5v10A1.5 1.5 0 0 0 5.5 19H19a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H5.5A1.5 1.5 0 0 1 4 7.5zM16 14h.01',
  calendar: 'M5 6.5h14v13H5zM5 10.5h14M9 4v4M15 4v4M8.5 14h2M13.5 14h2M8.5 17h2',
  clipboard:
    'M9 4h6v3H9zM8 5.5H6.5A1.5 1.5 0 0 0 5 7v12.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V7a1.5 1.5 0 0 0-1.5-1.5H16M8.5 12l1.5 1.5 3-3M8.5 17h7',
  sparkle:
    'M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9zM18.5 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z',
  chat: 'M5 5.5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4.5 3.5V16.5H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zM8.5 10h7M8.5 13h4.5',
  people:
    'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3.5 19.5a5.5 5.5 0 0 1 11 0M16 11a2.5 2.5 0 1 0 0-5M17.5 14.5a4.5 4.5 0 0 1 3 4.5',
  share:
    'M18 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18 20.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM8.2 13.3l7.6 4.4M15.8 6.3l-7.6 4.4',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  external:
    'M14 4.5h5.5V10M19.5 4.5 11 13M17 14v4.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1H10',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  pen: 'M4.5 19.5l1-4L15 6l3 3-9.5 9.5zM13 8l3 3',
} as const;

export type IconName = keyof typeof ICON_PATHS;

export interface IconProps {
  readonly name: IconName;
  readonly className?: string;
}

export function Icon({ name, className }: IconProps): ReactElement {
  return (
    <svg
      className={className === undefined ? 'icon' : `icon ${className}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
