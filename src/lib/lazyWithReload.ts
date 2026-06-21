/**
 * Sprint 38 / SWA stale-chunk fix — auto-reload wrapper for `React.lazy`.
 *
 * Failure mode being mitigated:
 *
 *   1. User opens the app at time T. Browser caches `/index.html` (max-age=30,
 *      `must-revalidate`) and any dynamic-import chunks it has visited.
 *   2. A new build deploys at T+N. Vite/Rollup re-hashes every chunk
 *      (`AssetList-<hash>.js`, `DeviceList-<hash>.js`, …).
 *   3. The user navigates to a route they haven't visited yet. Their cached
 *      `index.html` triggers `import('@/pages/assets/AssetList')` resolving to
 *      the OLD `AssetList-<oldhash>.js` URL, which no longer exists on the SWA.
 *   4. With the old SWA config the missing file returned `index.html` (because
 *      `responseOverrides.404 → /index.html, statusCode: 200`); the browser
 *      tried to parse HTML as JS and threw "Failed to fetch dynamically
 *      imported module". With the new SWA config it returns a real 404, which
 *      still surfaces the same Vite error.
 *
 * The right fix is a hard reload: the new `index.html` will point at the
 * current chunk hashes, the import will succeed, and the user lands on the
 * page they wanted. `must-revalidate` + `no-store` on `/` and `/index.html`
 * (set in `public/staticwebapp.config.json`) guarantees the reload fetches
 * the fresh HTML, not the cached copy.
 *
 * To avoid an infinite reload loop (in case the chunk really is missing —
 * e.g., bad deploy, network error, ad-blocker), {@link reloadForChunkError}
 * **throttles**: it records the timestamp of each auto-reload in sessionStorage
 * and refuses to reload again within {@link RELOAD_THROTTLE_MS}. So two stale
 * events minutes apart (a long-open tab spanning several deploys) each recover
 * silently, but a chunk that 404s on every load — which would reload within
 * milliseconds — trips the throttle and `<ErrorBoundary>` shows its card.
 *
 * Three call sites share this one throttle so they don't fight each other:
 *   - `lazyWithReload` (aliased as `lazy` in `src/App.tsx`) — the dynamic
 *     `import()` factory failing on first navigation to a route;
 *   - the `vite:preloadError` window listener in `src/main.tsx` — a
 *     `<link rel="modulepreload">` chunk 404ing independently of the import;
 *   - `<ErrorBoundary>` — a chunk error that propagated to React's boundary.
 *
 * Call sites: aliased as `lazy` in `src/App.tsx`, so the 34 existing
 * `lazy(() => import(...))` declarations get this behaviour automatically
 * with no diff at the call site.
 */

import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/** sessionStorage key holding the epoch-ms of the last auto-reload. */
const RELOAD_TS_KEY = 'tagpulse:chunk-reload-ts';
/** Don't auto-reload more than once per this window — the loop guard. */
export const RELOAD_THROTTLE_MS = 10_000;

/**
 * Detects the error shapes thrown by Vite/Rollup's `import()` polyfill and by
 * webpack-style ChunkLoadError. Kept liberal on purpose — Chrome, Firefox,
 * Safari, and Edge each phrase the message slightly differently when a
 * dynamically imported module fails to load.
 */
export function isChunkLoadError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = String((err as { name?: unknown }).name ?? '');
  const message = String((err as { message?: unknown }).message ?? '');
  if (name === 'ChunkLoadError') return true;
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Loading chunk \d+ failed/i.test(message)
  );
}

/**
 * Hard-reload the page to pick up the freshly-deployed `index.html` (and the
 * current chunk hashes it points at) — **throttled** so a genuinely missing
 * chunk can't spin the tab. Returns `true` if a reload was triggered, `false`
 * if it was suppressed by the throttle (the caller should then surface the
 * error instead of silently waiting for a reload that won't come).
 */
export function reloadForChunkError(): boolean {
  const now = Date.now();
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(RELOAD_TS_KEY) ?? '0') || 0;
  } catch {
    last = 0;
  }
  if (now - last < RELOAD_THROTTLE_MS) {
    // Reloaded too recently — the chunk is probably truly gone, not just
    // stale. Stop here so we don't loop; let the caller show the error.
    return false;
  }
  try {
    sessionStorage.setItem(RELOAD_TS_KEY, String(now));
  } catch {
    // ignore — best-effort throttle, worst case we reload twice
  }
  if (typeof window !== 'undefined' && window.location?.reload) {
    window.location.reload();
  }
  return true;
}

/**
 * Drop-in replacement for `React.lazy()` that hard-reloads the page (throttled)
 * when the dynamic import fails with a chunk-load error. If the throttle
 * suppresses the reload (a persistent failure), we rethrow so
 * `<ErrorBoundary>` can handle it.
 */
export function lazyWithReload<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      if (!isChunkLoadError(err)) throw err;
      if (!reloadForChunkError()) throw err;
      // Hang the promise: the reload is imminent, and resolving to a no-op
      // component would briefly flash before the page is replaced.
      return new Promise<{ default: T }>(() => {});
    }
  });
}

/**
 * Clear the reload throttle stamp. Exposed for tests.
 */
export function _resetReloadSentinel(): void {
  try {
    sessionStorage.removeItem(RELOAD_TS_KEY);
  } catch {
    // ignore
  }
}
