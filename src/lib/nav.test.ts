/**
 * Sprint 54 Phase B (54.2) — route-reachability smoke test.
 *
 * Walks `src/App.tsx`'s `<Route path="…">` table and asserts every
 * declared path is either:
 *   - surfaced under some left-sider section in `NAV_SECTIONS`,
 *   - one of the ungrouped top items in `NAV_TOP`, or
 *   - explicitly in `NAV_UNROUTED_ALLOWLIST` (account-dropdown chrome,
 *     deep-link / detail navigation from a list page, dev-only URLs).
 *
 * This prevents future drift: adding a new `<Route>` without either
 * surfacing it or allow-listing it as "reachable elsewhere" fails the
 * suite.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { NAV_SECTIONS, NAV_TOP, NAV_UNROUTED_ALLOWLIST, matchesPath } from './nav';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_TSX = resolve(HERE, '../App.tsx');

function extractRoutePaths(): string[] {
  const src = readFileSync(APP_TSX, 'utf8');
  // Match `<Route path="…"` declarations only (skip `<Navigate to="…">`).
  const paths: string[] = [];
  const re = /<Route\s+path=["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    paths.push(m[1]!);
  }
  return paths;
}

function navKeys(): string[] {
  return [...NAV_TOP.map((i) => i.key), ...NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.key))];
}

function isAllowlisted(routePath: string): boolean {
  for (const prefix of NAV_UNROUTED_ALLOWLIST) {
    if (routePath === prefix) return true;
    if (routePath.startsWith(prefix + '/')) return true;
  }
  return false;
}

function isReachableViaNav(routePath: string): boolean {
  // Strip dynamic segments (`:id`, `:epcHex`, `:view`) by treating
  // them as the segment boundary — i.e., the parent prefix must
  // match a nav key.
  // `matchesPath` already handles `/` and prefix-with-boundary.
  // For e.g. `/assets/:id`, we want `/assets` (a nav key) to match.
  // Replace `:foo` segments with a placeholder, then test by walking
  // up segments looking for a nav-key prefix.
  const stripped = routePath.replace(/\/:[^/]+/g, '');
  const candidates = [routePath, stripped];
  for (const candidate of candidates) {
    for (const key of navKeys()) {
      // matchesPath('/assets', '/assets') === true
      // matchesPath('/assets', '/assets/123') === true
      if (matchesPath(key, candidate)) return true;
    }
  }
  return false;
}

describe('route-reachability smoke (Sprint 54.2)', () => {
  const routes = extractRoutePaths();

  it('extracts the App.tsx route table', () => {
    expect(routes.length).toBeGreaterThan(30);
  });

  it('every <Route path="…"> is reachable via nav or allow-listed', () => {
    const unreachable: string[] = [];
    for (const routePath of routes) {
      if (isReachableViaNav(routePath)) continue;
      if (isAllowlisted(routePath)) continue;
      unreachable.push(routePath);
    }
    expect(unreachable, `unreachable routes — add to NAV_* or NAV_UNROUTED_ALLOWLIST:\n  ${unreachable.join('\n  ')}`).toEqual([]);
  });

  it('nav constraint: ≤4 sections + ≤3 ungrouped top items', () => {
    expect(NAV_SECTIONS.length).toBeLessThanOrEqual(4);
    expect(NAV_TOP.length).toBeLessThanOrEqual(3);
  });
});
