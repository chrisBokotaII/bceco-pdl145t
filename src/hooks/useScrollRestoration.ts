import { useEffect, useLayoutEffect, useRef } from 'react';

const SCROLL_PREFIX = 'bceco_pdl145t_scroll_v1:';

function storageKey(scope: string): string {
  return `${SCROLL_PREFIX}${scope}`;
}

function readScroll(scope: string): number | null {
  try {
    const raw = sessionStorage.getItem(storageKey(scope));
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

function writeScroll(scope: string, y: number) {
  try {
    sessionStorage.setItem(storageKey(scope), String(Math.max(0, Math.round(y))));
  } catch {
    /* ignore */
  }
}

/**
 * Persist window scroll per view scope (role + section/tab) across refresh
 * and back/forward within the SPA. Uses sessionStorage so a new tab starts clean.
 */
export function useScrollRestoration(scope: string, enabled = true) {
  const scopeRef = useRef(scope);
  const restoringRef = useRef(false);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.history.scrollRestoration = 'manual';
    } catch {
      /* ignore */
    }
  }, []);

  // Restore when scope becomes active / changes
  useLayoutEffect(() => {
    if (!enabled || !scope) return;

    const previousScope = scopeRef.current;
    if (previousScope && previousScope !== scope) {
      writeScroll(previousScope, window.scrollY);
    }
    scopeRef.current = scope;

    const saved = readScroll(scope);
    restoringRef.current = true;

    const apply = () => {
      const y = saved ?? 0;
      window.scrollTo(0, y);
      // Second pass after layout/images settle (dashboard charts, tables)
      requestAnimationFrame(() => {
        window.scrollTo(0, y);
        restoringRef.current = false;
      });
    };

    apply();
    const t = window.setTimeout(apply, 50);
    return () => window.clearTimeout(t);
  }, [scope, enabled]);

  // Persist while scrolling this scope
  useEffect(() => {
    if (!enabled || !scope) return;

    let ticking = false;
    const onScroll = () => {
      if (restoringRef.current) return;
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        writeScroll(scope, window.scrollY);
        ticking = false;
      });
    };

    const onHide = () => writeScroll(scope, window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') onHide();
    });

    return () => {
      writeScroll(scope, window.scrollY);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', onHide);
    };
  }, [scope, enabled]);
}

export function persistNavState(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function readNavState<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw && (allowed as readonly string[]).includes(raw)) return raw as T;
  } catch {
    /* ignore */
  }
  return fallback;
}
