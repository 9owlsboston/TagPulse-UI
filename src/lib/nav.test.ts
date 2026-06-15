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

  it('entity-first IA: domain-noun sections + Dashboard-only top (Sprint 61)', () => {
    // The top band is just Dashboard by default; movable items (Tag Reads,
    // Alerts) live in their owning entity sections.
    expect(NAV_TOP.map((i) => i.key)).toEqual(['/']);
    // The entity sections, in order. `sec-locations` is a placement target,
    // empty by default (Layout drops it until populated).
    expect(NAV_SECTIONS.map((s) => s.key)).toEqual([
      'sec-assets',
      'sec-tags',
      'sec-readers',
      'sec-inventory',
      'sec-alerts',
      'sec-locations',
      'sec-data-management',
    ]);
  });
});

describe('label-skin section header (Sprint 60/61, ADR-032 §4)', () => {
  const readersSection = NAV_SECTIONS.find((s) => s.key === 'sec-readers');

  it('the Readers (device) section carries a skinLabel', () => {
    expect(readersSection).toBeDefined();
    expect(readersSection!.skinLabel).toBeInstanceOf(Function);
  });

  it('reproduces the default entity label under the default label map', () => {
    // An empty override map resolves to DEFAULT_LABELS — the entity-first
    // section header is the pluralized default entity term ("Devices"), so a
    // non-WM tenant sees today's vocabulary.
    expect(readersSection!.skinLabel!({})).toBe('Devices');
  });

  it('applies the WM device→Reader skin to the section header', () => {
    expect(readersSection!.skinLabel!({ device: 'Reader' })).toBe('Readers');
  });
});


