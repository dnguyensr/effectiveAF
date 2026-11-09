// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useState } from 'preact/hooks';

export type Route = 'wallet' | 'compare';

/** "#compare" -> compare, "#wallet" -> wallet, anything else -> null (no explicit choice). */
export function parseRoute(hash: string): Route | null {
  if (hash === '#compare') return 'compare';
  if (hash === '#wallet') return 'wallet';
  return null;
}

/** The current view from the URL hash, so views can be linked and the back button works. */
export function useHashRoute(): [Route | null, (route: Route) => void] {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(location.hash));
    addEventListener('hashchange', onChange);
    return () => removeEventListener('hashchange', onChange);
  }, []);
  const go = (next: Route) => {
    if (location.hash !== `#${next}`) location.hash = next;
    setRoute(next);
  };
  return [route, go];
}

/**
 * Arrow-key navigation for a role="tablist" (WAI-ARIA tabs pattern): Left/Right move and wrap,
 * Home/End jump. Selects the new tab and moves focus to it.
 */
export function onTabKeyDown(
  event: KeyboardEvent,
  ids: readonly string[],
  current: string,
  select: (id: string) => void,
  domId: (id: string) => string,
) {
  const index = ids.indexOf(current);
  let next: number;
  switch (event.key) {
    case 'ArrowRight':
      next = (index + 1) % ids.length;
      break;
    case 'ArrowLeft':
      next = (index - 1 + ids.length) % ids.length;
      break;
    case 'Home':
      next = 0;
      break;
    case 'End':
      next = ids.length - 1;
      break;
    default:
      return;
  }
  event.preventDefault();
  const id = ids[next];
  if (id === undefined) return;
  select(id);
  document.getElementById(domId(id))?.focus();
}
