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
 * e.g., bad deploy, network error, ad-blocker), we set a sessionStorage
 * sentinel on the first reload. If another chunk-load error fires in the
 * same session the wrapper rethrows and `<ErrorBoundary>` shows its standard
 * "Something went wrong" card.
 *
 * Call sites: aliased as `lazy` in `src/App.tsx`, so the 34 existing
 * `lazy(() => import(...))` declarations get this behaviour automatically
 * with no diff at the call site.
 */

import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const RELOAD_KEY = 'tagpulse:chunk-reload-attempted';

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
 * Drop-in replacement for `React.lazy()` that hard-reloads the page once when
 * the dynamic import fails with a chunk-load error. After the first attempt
 * within a session we rethrow so `<ErrorBoundary>` can handle persistent
 * failures (e.g., asset truly missing on the CDN).
 */
export function lazyWithReload<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      if (!isChunkLoadError(err)) throw err;

      // Some environments (SSR, tests without jsdom, locked-down iframes) may
      // not expose sessionStorage. Treat that as "no sentinel" and proceed.
      let alreadyAttempted = false;
      try {
        alreadyAttempted = sessionStorage.getItem(RELOAD_KEY) !== null;
      } catch {
        alreadyAttempted = false;
      }

      if (alreadyAttempted) throw err;

      try {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
      } catch {
        // ignore — best-effort sentinel, worst case we reload twice
      }

      if (typeof window !== 'undefined' && window.location?.reload) {
        window.location.reload();
      }

      // Hang the promise: the reload is imminent, and resolving to a no-op
      // component would briefly flash before the page is replaced.
      return new Promise<{ default: T }>(() => {});
    }
  });
}

/**
 * Clear the once-per-session reload sentinel. Exposed for tests; not used by
 * the app itself (a successful navigation already means the new chunks
 * resolved, so leaving the sentinel set for the rest of the tab's life is
 * harmless — it only suppresses one future auto-reload).
 */
export function _resetReloadSentinel(): void {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    // ignore
  }
}
