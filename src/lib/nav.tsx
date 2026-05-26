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
 * Constraint per roadmap: **≤4 sections + ≤2 ungrouped top items**.
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
  RetweetOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  SwapOutlined,
  TagOutlined,
  TagsOutlined,
  ThunderboltOutlined,
  UploadOutlined,
} from '@ant-design/icons';

export type MinRole = 'viewer' | 'editor' | 'admin';
export type RequiredMode = 'asset' | 'inventory';

export interface NavItem {
  key: string;
  icon: ReactNode;
  label: string;
  minRole: MinRole;
  requires?: RequiredMode | RequiredMode[];
}

export interface NavSection {
  key: string;
  label: string;
  icon: ReactNode;
  items: NavItem[];
}

// ─── Ungrouped top items (≤2) ─────────────────────────────────────────────
export const NAV_TOP: NavItem[] = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard', minRole: 'viewer' },
  { key: '/alerts', icon: <AlertOutlined />, label: 'Alerts', minRole: 'viewer' },
];

// ─── Sections (≤4) ────────────────────────────────────────────────────────
export const NAV_SECTIONS: NavSection[] = [
  {
    key: 'sec-asset-tracking',
    label: 'Asset Tracking',
    icon: <AimOutlined />,
    items: [
      { key: '/assets', icon: <GoldOutlined />, label: 'Assets', minRole: 'viewer', requires: 'asset' },
      { key: '/tags', icon: <TagOutlined />, label: 'Tags', minRole: 'viewer' },
      // Sites/Zones are shared with inventory stock-levels — cross-mode.
      { key: '/sites', icon: <EnvironmentOutlined />, label: 'Locations', minRole: 'viewer', requires: ['asset', 'inventory'] },
      { key: '/map', icon: <GlobalOutlined />, label: 'Map', minRole: 'viewer', requires: 'asset' },
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
    key: 'sec-data-management',
    label: 'Data Management',
    icon: <DatabaseOutlined />,
    items: [
      { key: '/categories', icon: <FolderOutlined />, label: 'Categories', minRole: 'viewer' },
      { key: '/admin/labels', icon: <TagsOutlined />, label: 'Labels', minRole: 'admin' },
      { key: '/tags/import', icon: <UploadOutlined />, label: 'Tag Import', minRole: 'editor' },
      { key: '/tag-transfers', icon: <SwapOutlined />, label: 'Tag Transfers', minRole: 'viewer' },
      { key: '/tags/reconciliation', icon: <DiffOutlined />, label: 'Tag Reconciliation', minRole: 'viewer' },
      { key: '/inventory/csv-import', icon: <FileExcelOutlined />, label: 'Inventory CSV Import', minRole: 'admin', requires: 'inventory' },
    ],
  },
  {
    key: 'sec-devices-connections',
    label: 'Devices & Telemetry',
    icon: <DeploymentUnitOutlined />,
    items: [
      { key: '/devices', icon: <HddOutlined />, label: 'Devices', minRole: 'viewer' },
      { key: '/integrations', icon: <ApiOutlined />, label: 'Integrations', minRole: 'viewer' },
      { key: '/telemetry', icon: <LineChartOutlined />, label: 'Telemetry', minRole: 'viewer' },
      { key: '/telemetry-models', icon: <PartitionOutlined />, label: 'Telemetry Models', minRole: 'viewer' },
      { key: '/rules', icon: <ThunderboltOutlined />, label: 'Rules', minRole: 'viewer' },
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
  // Dev-only
  '/dev/tokens',
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
