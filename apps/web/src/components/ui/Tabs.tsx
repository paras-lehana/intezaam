/**
 * Accessible tabs — the WAI-ARIA Authoring Practices pattern with automatic activation.
 *
 * Responsibility: tablist / tab / tabpanel roles, a roving tabindex, Arrow Left / Right
 * (wrapping), Home / End, and aria-controls / aria-labelledby wiring. Boundary: controlled —
 * the parent owns the selected id so other parts of the page (a "See the budget" link, a
 * URL hash) can switch tabs. Panels mount on first visit and are then kept, so work in a
 * panel (a drafted message, ticked tasks) survives switching; `mountAll` mounts every
 * panel up front, for small forms whose inputs must always exist.
 */
import { type KeyboardEvent, type ReactElement, type ReactNode, useRef, useState } from 'react';
import '../../styles/tabs.css';

export interface TabItem {
  readonly id: string;
  readonly label: ReactNode;
  readonly panel: ReactNode;
}

export interface TabsProps {
  /** Prefix for element ids; must be unique on the page. */
  readonly idPrefix: string;
  /** Accessible name of the tab list. */
  readonly label: string;
  readonly items: readonly TabItem[];
  readonly selectedId: string;
  readonly onSelect: (id: string) => void;
  readonly mountAll?: boolean;
  readonly className?: string;
}

/** Keys that move between tabs, mapped to the index they move to. */
const KEY_MOVES: Readonly<Partial<Record<string, (index: number, count: number) => number>>> = {
  ArrowRight: (index, count) => (index + 1) % count,
  ArrowLeft: (index, count) => (index - 1 + count) % count,
  Home: () => 0,
  End: (_index, count) => count - 1,
};

/**
 * Element id of a tab, so other controls can point at it.
 * @example
 * tabElementId('plan', 'money'); // 'plan-tab-money'
 */
export function tabElementId(idPrefix: string, id: string): string {
  return `${idPrefix}-tab-${id}`;
}

/**
 * Element id of a tab panel.
 * @example
 * tabPanelId('plan', 'money'); // 'plan-panel-money'
 */
export function tabPanelId(idPrefix: string, id: string): string {
  return `${idPrefix}-panel-${id}`;
}

export function Tabs({
  idPrefix,
  label,
  items,
  selectedId,
  onSelect,
  mountAll = false,
  className,
}: TabsProps): ReactElement {
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const [visited, setVisited] = useState<ReadonlySet<string>>(() => new Set([selectedId]));
  // Adjusting state while rendering (React's documented pattern): the parent may select a
  // tab we have not seen yet, and it must mount in this same render.
  if (!visited.has(selectedId)) setVisited(new Set([...visited, selectedId]));

  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.id === selectedId),
  );

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    const move = KEY_MOVES[event.key];
    if (move === undefined) return;
    event.preventDefault();
    const next = items[move(selectedIndex, items.length)];
    if (next === undefined) return;
    onSelect(next.id);
    tabRefs.current.get(next.id)?.focus();
  }

  return (
    <div className={className === undefined ? 'tabs' : `tabs ${className}`}>
      <div role="tablist" aria-label={label} className="tabs__list">
        {items.map((item) => {
          const selected = item.id === selectedId;
          return (
            <button
              key={item.id}
              ref={(node) => {
                if (node !== null) tabRefs.current.set(item.id, node);
                return () => {
                  tabRefs.current.delete(item.id);
                };
              }}
              type="button"
              role="tab"
              id={tabElementId(idPrefix, item.id)}
              className="tabs__tab"
              aria-selected={selected}
              aria-controls={tabPanelId(idPrefix, item.id)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(item.id)}
              onKeyDown={handleKeyDown}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => {
        const selected = item.id === selectedId;
        const mounted = mountAll || selected || visited.has(item.id);
        return (
          <div
            key={item.id}
            role="tabpanel"
            id={tabPanelId(idPrefix, item.id)}
            className="tabs__panel"
            aria-labelledby={tabElementId(idPrefix, item.id)}
            hidden={!selected}
          >
            {mounted ? item.panel : null}
          </div>
        );
      })}
    </div>
  );
}
