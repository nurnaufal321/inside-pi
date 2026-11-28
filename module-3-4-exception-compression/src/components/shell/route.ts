import { useSyncExternalStore } from 'react';

export type View = 'home' | 'learn' | 'try' | 'ref';

export interface Route {
  lessonId: string | null;
  step: number;
  view: View;
}

function parse(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'reference') return { lessonId: null, step: 0, view: 'ref' };
  if (parts.length === 0 || parts[0] === 'home') return { lessonId: null, step: 0, view: 'home' };
  if (parts[1] === 'try') return { lessonId: parts[0], step: 0, view: 'try' };
  const n = Number(parts[1]);
  return { lessonId: parts[0], step: Number.isFinite(n) && n > 0 ? n - 1 : 0, view: 'learn' };
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parse(hash);
}

export const go = (to: string) => {
  window.location.hash = to;
};

export const stepHref = (lessonId: string, step: number) => `#/${lessonId}/${step + 1}`;

export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStore(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: progress just won't persist */
  }
}
