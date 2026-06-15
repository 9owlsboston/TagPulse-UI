/* eslint-disable react-refresh/only-export-components --
 * This is a data/registry module, not a React component module: it exports the
 * nav taxonomy (which embeds AntD icon JSX as data), pure helpers, and the
 * Sprint 61 placement registry — but **no React components**. Fast Refresh's
 * component-export rule therefore doesn't apply; the Sprint 61 additions
 * (MOVABLE_ITEMS, the Preferences catalogues, movableDefaultParent) trip its
 * heuristic only because the file mixes JSX-in-data with non-constant exports.
 */
/**
 * Sprint 54 Phase B (54.2) — sectioned left-nav registry.
 *
 * Single source of truth for the left-sider taxonomy. Consumed by:
 *   - `src/components/Layout.tsx` (renders the AntD Menu).
 *   - `src/lib/nav.test.ts` (route-reachability smoke test: every
 *     `<Route path="...">` declared in `src/App.tsx` must either be
 *     surfaced under some section / top item, or be explicitly
 *     allow-listed below as "reachable elsewhere" (account dropdown,
 *     deep-link from a list page, dev-only URL).
 *
 * Sprint 61 — **entity-first IA**: the top-level menu is the domain nouns
 * (Assets · Tags · Readers · Inventory · Alerts) plus one cross-cutting
 * catch-all (Data Management). Each entity section owns its primary views;
 * `Data Management` holds only reference data + bulk I/O. This supersedes the
 * earlier Sprint 54 "≤4 sections + ≤3 top items" constraint — the entity model
 * is the organizing principle now.
 *
 * Cross-mode gating uses `requires`. With a single mode string the
 * item is only shown when that mode is enabled in
 * `tenantConfig.tracking_modes`. An array means OR-semantics — visible
 * if any listed mode is enabled. Items with no `requires` are always
 * visible (cross-cutting infrastructure: tag registry, taxonomy,
 * devices, telemetry, integrations).
 */
import type { ReactNode } from 'react';
import {
  AimOutlined,
  AlertOutlined,
  ApiOutlined,
  AppstoreOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  DiffOutlined,
  EnvironmentOutlined,
  FileExcelOutlined,
  FolderOutlined,
  GlobalOutlined,
  GoldOutlined,
  HddOutlined,
  LineChartOutlined,
  PartitionOutlined,
  ReadOutlined,
  RetweetOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  SwapOutlined,
  TagOutlined,
  TagsOutlined,
  ThunderboltOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { pluralizeLabel, resolveLabel, type LabelKey, type LabelMap } from '@/lib/uiLabels';

export type MinRole = 'viewer' | 'editor' | 'admin';
export type RequiredMode = 'asset' | 'inventory';

export interface NavItem {
  key: string;
  icon: ReactNode;
  label: string;
  minRole: MinRole;
  requires?: RequiredMode | RequiredMode[];
  /**
   * Configurable-UI label-skin key (Sprint 60, ADR-032 §4). When set, the
   * rendered menu label is the resolved (skinnable, pluralized) display term
   * for this entity (e.g. `device` → "Readers") instead of the static `label`.
   * Unset items render `label` verbatim (nav groupings, non-entity pages).
   */
  labelKey?: LabelKey;
}

export interface NavSection {
  key: string;
  label: string;
  icon: ReactNode;
  /**
   * Configurable-UI label-skin hook (Sprint 60, ADR-032 §4). When set, the
   * section header renders this function's result over the resolved label map
   * instead of the static `label`. Used for composite headers (e.g.
   * "Devices & Telemetry" → "Readers & Telemetry") where only part of the
   * string is a skinnable entity, so naive pluralization can't be applied to
   * the whole label. Unset sections render `label` verbatim. Under the default
   * label map the function reproduces `label` byte-for-byte.
   */
  skinLabel?: (labels: LabelMap) => string;
  items: NavItem[];
}

// ─── Ungrouped top items ───────────────────────────────────────────────────
// Sprint 61 (entity-first IA): the menu is the domain nouns. Only Dashboard is
// an ungrouped top-level page by default; Tag Reads and Alerts moved into their
// owning entity sections (Tags / Alerts). Tag Reads is a *movable* item whose
// default parent is the Tags section but can be pinned back to top-level via
// the `nav.placement` leaf (Sprint 61 PR-B/C).
export const NAV_TOP: NavItem[] = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard', minRole: 'viewer' },
];

// ─── Sections (entity-first) ───────────────────────────────────────────────
// Each section is a domain entity that owns its primary views; `Data
// Management` is the cross-cutting reference-data + bulk-I/O catch-all. Section
// headers skin off the label registry so a tenant's entity rename (e.g.
// device→Reader) flows to the header. `sec-locations` is defined but empty by
// default — it is a *placement target* (Sprint 61): Locations/Map default into
// the Assets section and a tenant may relocate them here. Empty sections are
// dropped by Layout, so it never renders until populated by placement.
export const NAV_SECTIONS: NavSection[] = [
  {
    key: 'sec-assets',
    label: 'Assets',
    icon: <AimOutlined />,
    skinLabel: (labels) => pluralizeLabel(resolveLabel(labels, 'asset')),
    items: [
      { key: '/assets', icon: <GoldOutlined />, label: 'Assets', minRole: 'viewer', requires: 'asset', labelKey: 'asset' },
      // Sites/Zones are shared with inventory stock-levels — cross-mode.
      { key: '/sites', icon: <EnvironmentOutlined />, label: 'Locations', minRole: 'viewer', requires: ['asset', 'inventory'] },
      { key: '/map', icon: <GlobalOutlined />, label: 'Map', minRole: 'viewer', requires: 'asset' },
    ],
  },
  {
    key: 'sec-tags',
    label: 'Tags',
    icon: <TagOutlined />,
    skinLabel: (labels) => pluralizeLabel(resolveLabel(labels, 'tag')),
    items: [
      { key: '/tags', icon: <TagOutlined />, label: 'Tags', minRole: 'viewer', labelKey: 'tag' },
      // Tag Reads is movable — default parent is Tags (can be pinned top-level).
      { key: '/tag-reads', icon: <ReadOutlined />, label: 'Tag Reads', minRole: 'viewer', labelKey: 'tagRead' },
      { key: '/tag-transfers', icon: <SwapOutlined />, label: 'Tag Transfers', minRole: 'viewer' },
      { key: '/tags/reconciliation', icon: <DiffOutlined />, label: 'Tag Reconciliation', minRole: 'viewer' },
      { key: '/tags/import', icon: <UploadOutlined />, label: 'Tag Import', minRole: 'editor' },
    ],
  },
  {
    key: 'sec-readers',
    label: 'Readers',
    icon: <DeploymentUnitOutlined />,
    skinLabel: (labels) => pluralizeLabel(resolveLabel(labels, 'device')),
    items: [
      { key: '/devices', icon: <HddOutlined />, label: 'Devices', minRole: 'viewer', labelKey: 'device' },
      { key: '/telemetry', icon: <LineChartOutlined />, label: 'Telemetry', minRole: 'viewer', labelKey: 'telemetry' },
      { key: '/telemetry-models', icon: <PartitionOutlined />, label: 'Telemetry Models', minRole: 'viewer' },
      { key: '/integrations', icon: <ApiOutlined />, label: 'Integrations', minRole: 'viewer' },
    ],
  },
  {
    key: 'sec-inventory',
    label: 'Inventory',
    icon: <ShoppingOutlined />,
    items: [
      { key: '/inventory/products', icon: <ShoppingCartOutlined />, label: 'Products', minRole: 'viewer', requires: 'inventory' },
      { key: '/inventory/lots', icon: <ClockCircleOutlined />, label: 'Lot Expiry', minRole: 'viewer', requires: 'inventory' },
      { key: '/inventory/stock-levels', icon: <AppstoreOutlined />, label: 'Stock Levels', minRole: 'viewer', requires: 'inventory' },
      { key: '/inventory/stock-movements', icon: <RetweetOutlined />, label: 'Stock Movements', minRole: 'viewer', requires: 'inventory' },
    ],
  },
  {
    key: 'sec-alerts',
    label: 'Alerts',
    icon: <AlertOutlined />,
    skinLabel: (labels) => pluralizeLabel(resolveLabel(labels, 'alert')),
    items: [
      { key: '/alerts', icon: <AlertOutlined />, label: 'Alerts', minRole: 'viewer', labelKey: 'alert' },
      { key: '/rules', icon: <ThunderboltOutlined />, label: 'Rules', minRole: 'viewer' },
    ],
  },
  {
    key: 'sec-locations',
    label: 'Locations',
    icon: <EnvironmentOutlined />,
    // Empty by default — a placement target for Locations/Map (Sprint 61).
    // Layout drops empty sections, so this only renders once a tenant relocates
    // an item here via `nav.placement`.
    items: [],
  },
  {
    key: 'sec-data-management',
    label: 'Data Management',
    icon: <DatabaseOutlined />,
    items: [
      { key: '/categories', icon: <FolderOutlined />, label: 'Categories', minRole: 'viewer' },
      { key: '/admin/labels', icon: <TagsOutlined />, label: 'Labels', minRole: 'admin' },
      { key: '/inventory/csv-import', icon: <FileExcelOutlined />, label: 'Inventory CSV Import', minRole: 'admin', requires: 'inventory' },
    ],
  },
];

/**
 * Routes intentionally NOT surfaced in the left sider. They remain
 * reachable via:
 *   - AccountDropdown (tenant-admin chrome)
 *   - Deep-link / detail navigation from a list page
 *   - Direct URL typing (dev-only routes)
 *
 * Stored as path prefixes — any route that starts with one of these
 * (with `/` or end-of-string boundary) is considered allow-listed.
 */
export const NAV_UNROUTED_ALLOWLIST: readonly string[] = [
  // Tenant-admin chrome — surfaced via AccountDropdown
  '/admin/tenant',
  '/admin/branding',
  '/admin/usage',
  '/admin/users',
  '/admin/audit-logs',
  '/admin/dead-letters',
  '/admin/pending-bulk-operations',
  '/admin/tag-data-mappings',
  // User preferences — surfaced via AccountDropdown (all roles)
  '/preferences',
  // Dev-only
  '/dev/tokens',
  '/dev/charts',
];

/**
 * Returns the section whose item list contains the given pathname,
 * matching on longest-prefix. Used by Layout to drive
 * `defaultOpenKeys`.
 */
export function sectionForPath(pathname: string): NavSection | undefined {
  let best: { sec: NavSection; len: number } | undefined;
  for (const sec of NAV_SECTIONS) {
    for (const item of sec.items) {
      if (matchesPath(item.key, pathname) && (best === undefined || item.key.length > best.len)) {
        best = { sec, len: item.key.length };
      }
    }
  }
  return best?.sec;
}

/**
 * True if `pathname` is `key` exactly, or a sub-path of `key` (with
 * the `/` boundary). The root `/` only matches the root pathname so
 * we don't claim every route as "Dashboard".
 */
export function matchesPath(key: string, pathname: string): boolean {
  if (key === '/') return pathname === '/';
  if (pathname === key) return true;
  return pathname.startsWith(key + '/');
}

// ─── Sprint 60 (ADR-032 §4 `nav`) — config-driven visibility + ordering ─────

/**
 * Curated registry of *movable* nav items (Sprint 61) — lock-step with the
 * backend `MOVABLE_ITEMS` (`src/tagpulse/services/ui_config.py`). Each item maps
 * to its candidate parents; the **first entry is the default parent**. A
 * `nav.placement` override pins an item to one of these; the backend validates
 * the same vocabulary (unknown item / non-candidate parent → 422), so the UI
 * trusts the resolved config but still falls back safely. The reserved parent
 * token `TOP_PARENT` means "ungrouped top-level page".
 */
export const TOP_PARENT = 'top';

export const MOVABLE_ITEMS: Readonly<Record<string, readonly string[]>> = {
  '/tag-reads': ['sec-tags', TOP_PARENT],
  '/sites': ['sec-assets', 'sec-locations'],
  '/map': ['sec-assets', 'sec-locations'],
};

/** The default (first-listed) parent for a movable item, or `undefined`. */
export function movableDefaultParent(itemKey: string): string | undefined {
  return MOVABLE_ITEMS[itemKey]?.[0];
}

// ─── Preferences "Menu" catalogue (Sprint 61 PR-D) ──────────────────────────
// A lightweight, label-only view of the top-level menu entries a user may hide,
// derived from NAV_SECTIONS so it can never drift. Empty placement-target
// sections (no items, e.g. sec-locations) are excluded — there's nothing to
// hide until something is placed there. Consumed by the Preferences page to
// render the check/uncheck list that writes `nav.hidden`.
export interface MenuSectionEntry {
  key: string;
  label: string;
}

export const NAV_MENU_SECTIONS: readonly MenuSectionEntry[] = NAV_SECTIONS.filter(
  (s) => s.items.length > 0,
).map((s) => ({ key: s.key, label: s.label }));

// The movable items a user can relocate, with a human label and the candidate
// parents (parent key → display label). Derived from MOVABLE_ITEMS + the nav
// registry so the Preferences placement pickers stay in lock-step.
export interface MovableEntry {
  key: string;
  label: string;
  candidates: { value: string; label: string }[];
}

function navItemLabel(itemKey: string): string {
  for (const sec of NAV_SECTIONS) {
    const found = sec.items.find((i) => i.key === itemKey);
    if (found) return found.label;
  }
  const topItem = NAV_TOP.find((i) => i.key === itemKey);
  return topItem?.label ?? itemKey;
}

function parentLabel(parentKey: string): string {
  if (parentKey === TOP_PARENT) return 'Top level';
  return NAV_SECTIONS.find((s) => s.key === parentKey)?.label ?? parentKey;
}

export const NAV_MOVABLE_ENTRIES: readonly MovableEntry[] = Object.entries(MOVABLE_ITEMS).map(
  ([key, candidates]) => ({
    key,
    label: navItemLabel(key),
    candidates: candidates.map((value) => ({ value, label: parentLabel(value) })),
  }),
);

/** The resolved `nav` leaf: keys to hide, an explicit ordering, and placement. */
export interface NavConfigApplied {
  hidden: string[];
  order: string[];
  /** `{ movable-item-key: parent }` — parent is a section key or `TOP_PARENT`. */
  placement: Record<string, string>;
}

/**
 * Stable reorder of `{ key }` items by an explicit `order` list. Keys present
 * in `order` sort to the front in that order; keys absent from it keep their
 * original relative position behind the ordered ones. An empty `order` is a
 * no-op (today's order preserved).
 */
function orderByKeys<T extends { key: string }>(items: T[], order: string[]): T[] {
  if (order.length === 0) return items;
  const idx = new Map(order.map((k, i) => [k, i] as const));
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => {
      const ai = idx.get(a.item.key) ?? Number.MAX_SAFE_INTEGER;
      const bi = idx.get(b.item.key) ?? Number.MAX_SAFE_INTEGER;
      return ai !== bi ? ai - bi : a.i - b.i;
    })
    .map((x) => x.item);
}

/**
 * Apply the resolved `nav` leaf (ADR-032 §4) to the already role/mode-filtered
 * nav. **Config can only further restrict, relocate, or reorder, never reveal**
 * — it runs *after* the role/mode authorization filter.
 *
 * Order of operations:
 *   1. **Placement** (Sprint 61): each movable item present in the tree is
 *      relocated to its resolved parent (override → default). A parent of
 *      `TOP_PARENT` moves it to the ungrouped top band; any other value is a
 *      section key. Each movable item ends up in exactly one place (it is
 *      removed from its default parent before being inserted at the target).
 *   2. **Hide**: a `hidden` entry drops a section, a top item, or an item
 *      within a section; an emptied section drops out entirely.
 *   3. **Order**: `order` is matched against the flat key space, so a tenant
 *      reorders sections, top items, and items-within-a-section from one list.
 *
 * All inputs default to empty (today's nav unchanged).
 */
export function applyNavConfig(
  top: NavItem[],
  sections: NavSection[],
  cfg: NavConfigApplied,
): { top: NavItem[]; sections: NavSection[] } {
  // ── 1. Placement — relocate movable items to their resolved parent ────────
  const placed = relocateMovableItems(top, sections, cfg.placement);

  // ── 2 + 3. Hide + order ──────────────────────────────────────────────────
  const hidden = new Set(cfg.hidden);
  const filteredTop = orderByKeys(
    placed.top.filter((item) => !hidden.has(item.key)),
    cfg.order,
  );
  const filteredSections = orderByKeys(
    placed.sections
      .map((sec) => ({
        ...sec,
        items: orderByKeys(
          sec.items.filter((item) => !hidden.has(item.key)),
          cfg.order,
        ),
      }))
      .filter((sec) => !hidden.has(sec.key) && sec.items.length > 0),
    cfg.order,
  );
  return { top: filteredTop, sections: filteredSections };
}

/**
 * Pull every movable item out of its current parent and re-insert it at its
 * resolved parent (placement override → registry default). Pure: returns new
 * arrays, never mutates the inputs. An item whose resolved parent is
 * `TOP_PARENT` joins the top band; otherwise it is appended to the matching
 * section. A resolved parent naming a section not present in the tree leaves
 * the item at its home parent (defensive — the backend validator already
 * constrains parents to candidates).
 */
function relocateMovableItems(
  top: NavItem[],
  sections: NavSection[],
  placement: Record<string, string>,
): { top: NavItem[]; sections: NavSection[] } {
  // Only items whose resolved parent differs from their default need moving.
  const moves = new Map<string, string>(); // itemKey → resolved parent
  const pinned = placement ?? {};
  for (const itemKey of Object.keys(MOVABLE_ITEMS)) {
    const resolved = pinned[itemKey] ?? movableDefaultParent(itemKey);
    const current = movableDefaultParent(itemKey);
    if (resolved && resolved !== current) moves.set(itemKey, resolved);
  }
  if (moves.size === 0) return { top, sections };

  // Detach the moving items from wherever they are, remembering each one.
  const detached = new Map<string, NavItem>();
  const strip = (items: NavItem[]): NavItem[] =>
    items.filter((it) => {
      if (moves.has(it.key)) {
        detached.set(it.key, it);
        return false;
      }
      return true;
    });

  let nextTop = strip(top);
  const nextSections = sections.map((sec) => ({ ...sec, items: strip(sec.items) }));

  // Re-insert each moved item at its resolved parent (only if it survived the
  // role/mode filter, i.e. we actually detached it).
  for (const [itemKey, parent] of moves) {
    const item = detached.get(itemKey);
    if (!item) continue;
    if (parent === TOP_PARENT) {
      nextTop = [...nextTop, item];
      continue;
    }
    const target = nextSections.find((sec) => sec.key === parent);
    if (target) {
      target.items = [...target.items, item];
    } else {
      const home = nextSections.find((sec) => sec.key === movableDefaultParent(itemKey));
      if (home) home.items = [...home.items, item];
      else nextTop = [...nextTop, item];
    }
  }

  return { top: nextTop, sections: nextSections };
}
