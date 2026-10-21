/**
 * Escape closes a workspace tool (What if, Ask) and puts focus back on the button that
 * opened it.
 *
 * Responsibility: listen for Escape inside a tool, find the disclosure button that controls
 * the tool's region through the standard `aria-controls` relation, press it (the workspace
 * owns the open state) and move focus back to it, so a keyboard user is never left on
 * content that has just been hidden. Boundary: the tools are non-modal disclosures — the
 * plan stays readable and usable beside them — so focus is deliberately not trapped; a tool
 * rendered outside the workspace (no controlling button) leaves Escape alone.
 */
import { type RefObject, useEffect, useRef } from 'react';

/**
 * The button whose `aria-controls` names the nearest region around `element`, if any.
 * @example
 * controllerOf(drawerRoot); // the "What if…" button when the drawer sits in section#what-if
 */
export function controllerOf(element: Element): HTMLElement | null {
  // Efficiency: a page has a handful of aria-controls buttons; read them once per key press.
  const controllers = [...document.querySelectorAll<HTMLElement>('[aria-controls]')];
  for (let node = element.parentElement; node !== null; node = node.parentElement) {
    const { id } = node;
    if (id === '') continue;
    const found = controllers.find((button) =>
      (button.getAttribute('aria-controls') ?? '').split(/\s+/).includes(id),
    );
    if (found !== undefined) return found;
  }
  return null;
}

/**
 * A ref for a tool's root element that makes Escape close the tool.
 * @example
 * const rootRef = useCloseOnEscape<HTMLDivElement>();
 * return <div ref={rootRef}>…</div>;
 */
export function useCloseOnEscape<T extends HTMLElement>(): RefObject<T | null> {
  const rootRef = useRef<T | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (root === null) return undefined;
    const scope: HTMLElement = root;
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const trigger = controllerOf(scope);
      if (trigger === null) return;
      event.preventDefault();
      if (trigger.getAttribute('aria-expanded') === 'true') trigger.click();
      trigger.focus();
    }
    scope.addEventListener('keydown', handleKeyDown);
    return () => scope.removeEventListener('keydown', handleKeyDown);
  }, []);

  return rootRef;
}
