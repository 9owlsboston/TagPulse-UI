import { useCallback, useEffect, useState } from 'react';
import AntLayout from 'antd/es/layout';
import Menu from 'antd/es/menu';
import Alert from 'antd/es/alert';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  HddOutlined,
  LineChartOutlined,
  ThunderboltOutlined,
  AlertOutlined,
  ApiOutlined,
  DatabaseOutlined,
  ShoppingOutlined,
  AppstoreOutlined,
  SwapOutlined,
  ClockCircleOutlined,
  TagOutlined,
  TagsOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTenantConfig } from '@/hooks/useTenantConfig';
import { useVersionInfo, useHealthStatus } from '@/components/ApiHealthGate';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { AccountDropdown } from '@/components/AccountDropdown';
import { BrandSync } from '@/components/BrandSync';
import { useThemeMode } from '@/theme/ThemeProvider';
import Typography from 'antd/es/typography';
const { Sider, Header, Content } = AntLayout;
const { Text } = Typography;

type MinRole = 'viewer' | 'editor' | 'admin';
type RequiredMode = 'asset' | 'inventory';

interface NavItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  minRole: MinRole;
  requires?: RequiredMode;
}

// Sprint 41 Phase F5 — sidebar reorganization.
//
// Operator-day nav only. Admin chrome lives in the Account dropdown (QW3)
// so the sidebar stays focused on what crew use minute-to-minute. Groups:
//   * Dashboard (solo, no group header)
//   * EVENTS & ALERTS (Phase F1)      — telemetry pipeline + rules + alerts
//   * ASSETS                          — asset taxonomy + locations + map
//   * INVENTORY                       — stock-tracking surfaces
//   * EDGE & CONNECTIONS              — physical devices + outbound webhooks
//
// The label "EVENTS & ALERTS" is intentionally neutral (Azure-Monitor-aligned)
// rather than "Signaling Events & Data" so the post-Sprint-41 taxonomy
// unification doesn't have to rename it again. The previous DATA MANAGEMENT
// / EDGE MANAGEMENT split (Sprint 33) is collapsed into the new four-group
// layout — Dashboard stands alone, Integrations joins Devices under "Edge
// & Connections".
const DASHBOARD_NAV: NavItem[] = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard', minRole: 'viewer' },
];

const EVENTS_NAV: NavItem[] = [
  { key: '/telemetry', icon: <LineChartOutlined />, label: 'Telemetry', minRole: 'viewer' },
  { key: '/telemetry-models', icon: <DatabaseOutlined />, label: 'Telemetry Models', minRole: 'viewer' },
  { key: '/rules', icon: <ThunderboltOutlined />, label: 'Rules', minRole: 'viewer' },
  { key: '/alerts', icon: <AlertOutlined />, label: 'Alerts', minRole: 'viewer' },
];

const ASSETS_NAV: NavItem[] = [
  { key: '/assets', icon: <TagOutlined />, label: 'Assets', minRole: 'viewer', requires: 'asset' },
  // Sprint 44 Phase B — tag registry list/detail (ADR 028).
  { key: '/tags', icon: <TagOutlined />, label: 'Tags', minRole: 'viewer' },
  // Sprint 45 Phase C — CSV import wizard for the tag registry.
  { key: '/tags/import', icon: <TagOutlined />, label: 'Import tags', minRole: 'editor' },
  // Sprint 46 Phase D — cross-tenant transfer queue.
  { key: '/tag-transfers', icon: <TagOutlined />, label: 'Tag transfers', minRole: 'viewer' },
  // Sprint 47 Phase E — reconciliation views (read-only triage).
  { key: '/tags/reconciliation', icon: <TagOutlined />, label: 'Tag reconciliation', minRole: 'viewer' },
  { key: '/categories', icon: <TagsOutlined />, label: 'Categories', minRole: 'viewer' },
  { key: '/sites', icon: <EnvironmentOutlined />, label: 'Locations', minRole: 'viewer', requires: 'asset' },
  { key: '/map', icon: <GlobalOutlined />, label: 'Map', minRole: 'viewer', requires: 'asset' },
];

const INVENTORY_NAV: NavItem[] = [
  { key: '/inventory/products', icon: <ShoppingOutlined />, label: 'Products', minRole: 'viewer', requires: 'inventory' },
  { key: '/inventory/lots', icon: <ClockCircleOutlined />, label: 'Lot Expiry', minRole: 'viewer', requires: 'inventory' },
  { key: '/inventory/stock-levels', icon: <AppstoreOutlined />, label: 'Stock Levels', minRole: 'viewer', requires: 'inventory' },
  { key: '/inventory/stock-movements', icon: <SwapOutlined />, label: 'Stock Movements', minRole: 'viewer', requires: 'inventory' },
  { key: '/inventory/csv-import', icon: <UploadOutlined />, label: 'CSV Import', minRole: 'admin', requires: 'inventory' },
];

const EDGE_NAV: NavItem[] = [
  { key: '/devices', icon: <HddOutlined />, label: 'Devices', minRole: 'viewer' },
  { key: '/integrations', icon: <ApiOutlined />, label: 'Integrations', minRole: 'viewer' },
];

// Sprint 41 Phase F6 — collapsed-sidebar persistence.
// Per-tenant + per-user key so a shared workstation doesn't bleed one
// operator's preference into another. Falls back to a global key when
// either piece is missing (pre-login, demo mode).
const COLLAPSED_STORAGE_PREFIX = 'tagpulse.sidebar.collapsed';
const SIDER_WIDTH_EXPANDED = 240;
const SIDER_WIDTH_COLLAPSED = 64;

function collapsedStorageKey(tenantId: string | null, userId: string | null | undefined): string {
  const t = tenantId ?? '_';
  const u = userId ?? '_';
  return `${COLLAPSED_STORAGE_PREFIX}:${t}:${u}`;
}

function readPersistedCollapsed(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writePersistedCollapsed(key: string, collapsed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, collapsed ? '1' : '0');
  } catch {
    // best-effort; quota / private-mode failures are non-fatal
  }
}

const ROLE_LEVEL: Record<string, number> = { viewer: 0, editor: 1, admin: 2 };

function filterNav(items: NavItem[], role: string, enabledModes: Set<string>): NavItem[] {
  return items.filter(
    (item) =>
      (ROLE_LEVEL[role] ?? 0) >= (ROLE_LEVEL[item.minRole] ?? 0) &&
      (item.requires === undefined || enabledModes.has(item.requires)),
  );
}

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, tenantId } = useAuth();
  const { data: tenantConfig } = useTenantConfig();
  const versionInfo = useVersionInfo();
  const { degraded, degradedReason, degradedDetail } = useHealthStatus();
  const { mode } = useThemeMode();
  // Branding is best-effort here — the Sider chrome falls back to the
  // tenant name from auth context when /tenant/branding 401s or returns
  // empty overrides.
  const { data: branding } = useTenantBranding(!!user);

  const enabledModes = new Set(tenantConfig?.tracking_modes ?? ['asset', 'inventory']);

  const dashboardItems = filterNav(DASHBOARD_NAV, role, enabledModes);
  const eventsItems = filterNav(EVENTS_NAV, role, enabledModes);
  const assetsItems = filterNav(ASSETS_NAV, role, enabledModes);
  const inventoryItems = filterNav(INVENTORY_NAV, role, enabledModes);
  const edgeItems = filterNav(EDGE_NAV, role, enabledModes);

  // Sprint 41 Phase F6 — collapsed-sidebar state, persisted per
  // (tenant, user). We re-hydrate whenever the storage key changes
  // (login / tenant switch) so two users on the same browser get
  // independent preferences.
  const collapsedKey = collapsedStorageKey(tenantId, user?.id ?? null);
  const [collapsed, setCollapsedState] = useState<boolean>(() => readPersistedCollapsed(collapsedKey));
  useEffect(() => {
    setCollapsedState(readPersistedCollapsed(collapsedKey));
  }, [collapsedKey]);
  const setCollapsed = useCallback(
    (next: boolean) => {
      setCollapsedState(next);
      writePersistedCollapsed(collapsedKey, next);
    },
    [collapsedKey],
  );
  /**
   * AntD's `Sider.onCollapse(collapsed, type)` fires for BOTH the
   * built-in trigger click AND for the responsive breakpoint handler
   * — so a fresh mount under a narrow viewport (or jsdom's "no
   * match" default for the `lg` media query) would call back with
   * `type: 'responsive'` and persist that view-width-driven value as
   * the user's preference, clobbering the genuine choice they made
   * last session. Only persist click-trigger collapses; responsive
   * events still update the visible state (so the icon-mode chrome
   * follows the viewport) but leave the stored preference intact.
   */
  const handleSiderCollapse = useCallback(
    (next: boolean, type: 'clickTrigger' | 'responsive') => {
      if (type === 'responsive') {
        setCollapsedState(next);
        return;
      }
      setCollapsed(next);
    },
    [setCollapsed],
  );

  // Sprint 41 Phase F1 + F5 — grouped menu items, four named groups.
  // Group headers are hidden when the Sider is collapsed (Ant Menu
  // suppresses `type: 'group'` labels in icon-only mode automatically,
  // but the empty header row still reserves vertical space, so we drop
  // the group wrapper entirely when collapsed and render a flat item
  // list with hover tooltips coming from the Menu's built-in behaviour).
  const groups: { key: string; label: string; items: NavItem[] }[] = [
    { key: 'grp-events', label: 'EVENTS & ALERTS', items: eventsItems },
    { key: 'grp-assets', label: 'ASSETS', items: assetsItems },
    { key: 'grp-inventory', label: 'INVENTORY', items: inventoryItems },
    { key: 'grp-edge', label: 'EDGE & CONNECTIONS', items: edgeItems },
  ].filter((g) => g.items.length > 0);

  const navItemToMenuItem = ({ key, icon, label }: NavItem) => ({ key, icon, label });

  const menuItems: MenuProps['items'] = collapsed
    ? [
        ...dashboardItems.map(navItemToMenuItem),
        ...groups.flatMap((g) => g.items.map(navItemToMenuItem)),
      ]
    : [
        ...dashboardItems.map(navItemToMenuItem),
        ...groups.map((g) => ({
          type: 'group' as const,
          key: g.key,
          label: g.label,
          children: g.items.map(navItemToMenuItem),
        })),
      ];

  const flatItems = [
    ...dashboardItems,
    ...eventsItems,
    ...assetsItems,
    ...inventoryItems,
    ...edgeItems,
  ];
  const selectedKey =
    flatItems
      .filter((item) =>
        item.key === '/' ? location.pathname === '/' : location.pathname.startsWith(item.key),
      )
      .sort((a, b) => b.key.length - a.key.length)[0]?.key ?? '/';

  // Sider chrome: branding display_name + optional logo (QW6) over
  // a tenant-name fallback. Colour roles flow through semantic tokens
  // (ADR-029) — the AntD Sider `theme` prop still drives menu chrome
  // so we keep the light/dark mapping for that, but background and
  // borders read from `var(--color-surface)` / `var(--color-border)`.
  const siderBg = 'var(--color-surface)';
  const siderTitleColor = 'var(--color-text)';
  const siderFooterColor = 'var(--color-text-muted)';
  const siderBorder = '1px solid var(--color-border)';

  const tenantDisplayName =
    branding?.display_name?.trim() ||
    user?.tenant_name ||
    (tenantConfig?.name ?? null) ||
    tenantId ||
    'TagPulse';
  const logoUrl = branding?.logo_url?.trim();

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <BrandSync />
      <Sider
        width={SIDER_WIDTH_EXPANDED}
        collapsedWidth={SIDER_WIDTH_COLLAPSED}
        collapsible
        collapsed={collapsed}
        onCollapse={handleSiderCollapse}
        breakpoint="lg"
        theme={mode === 'dark' ? 'dark' : 'light'}
        style={{ position: 'relative', background: siderBg, borderRight: siderBorder }}
        data-testid="sider"
        data-collapsed={collapsed ? 'true' : 'false'}
      >
        <div
          style={{
            padding: collapsed ? '16px 0' : '16px 20px',
            color: siderTitleColor,
            fontWeight: 700,
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 10,
            minHeight: 64,
            borderBottom: siderBorder,
          }}
          data-testid="sider-brand-header"
        >
          {logoUrl && (
            <img
              src={logoUrl}
              alt=""
              style={{ height: 28, maxWidth: 28, objectFit: 'contain' }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          {!collapsed && (
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tenantDisplayName}
            </span>
          )}
        </div>
        <Menu
          theme={mode === 'dark' ? 'dark' : 'light'}
          mode="inline"
          inlineCollapsed={collapsed}
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ marginBottom: 56, borderRight: 0, background: 'transparent' }}
        />
        {!collapsed && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              width: '100%',
              padding: '12px 20px',
              borderTop: siderBorder,
            }}
            data-testid="version-footer"
          >
            <Text style={{ color: siderFooterColor, fontSize: 11, display: 'block' }}>
              UI {versionInfo.uiVersion} · API {versionInfo.apiVersion}
            </Text>
          </div>
        )}
      </Sider>
      <AntLayout>
        <Header
          style={{
            background: 'var(--color-surface)',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 12,
            borderBottom: siderBorder,
          }}
        >
          <AccountDropdown />
        </Header>
        <Content style={{ margin: 24 }}>
          {degraded && (
            <Alert
              type="warning"
              showIcon
              data-testid="api-degraded-banner"
              style={{ marginBottom: 16 }}
              message={
                degradedReason === 'database'
                  ? 'TagPulse database is unreachable — live data may be stale or missing.'
                  : `TagPulse API reports a degraded dependency: ${degradedReason ?? 'unknown'}.`
              }
              description={
                degradedReason === 'database'
                  ? 'Operators: check the dev Postgres server in tagpulse-dev-rg (Burstable tier auto-stops after ~7 days idle).'
                  : degradedDetail ?? undefined
              }
            />
          )}
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
