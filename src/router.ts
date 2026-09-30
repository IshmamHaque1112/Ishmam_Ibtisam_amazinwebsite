import { useEffect, useState } from 'react';
import { parseHash, Route } from './routes';

// Tiny hash router. The route table and link builders live in routes.ts
// (plain TypeScript, unit tested); this file adds the React hook.

export type { Route } from './routes';
export { parseHash, href, safeNext } from './routes';

// A "quiet" navigation (used by sort and filter controls) updates the URL
// without scrolling to the top or moving focus, so keyboard users stay on
// the control they just changed.
let pendingQuiet = false;
let lastWasQuiet = false;

export const navigate = (to: string, options: { quiet?: boolean } = {}) => {
  const next = to.replace(/^#/, '');
  if (window.location.hash.replace(/^#/, '') === next) return;
  pendingQuiet = Boolean(options.quiet);
  window.location.hash = next;
};

export const wasQuietNavigation = () => lastWasQuiet;

export const useRoute = (): Route => {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      lastWasQuiet = pendingQuiet;
      pendingQuiet = false;
      setRoute(parseHash(window.location.hash));
      if (!lastWasQuiet) window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
};

// Sets the browser tab title for the current page (WCAG 2.4.2).
export const useDocumentTitle = (title: string) => {
  useEffect(() => {
    document.title = title ? `${title} · Amazin` : 'Amazin — Transparent Shopping';
  }, [title]);
};
