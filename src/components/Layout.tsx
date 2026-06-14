import { useCallback, useEffect, useMemo, useState } from 'react';
import AntLayout from 'antd/es/layout';
import Menu from 'antd/es/menu';
import Alert from 'antd/es/alert';
import type { MenuProps } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useUiConfigContext, useNavConfig } from '@/lib/uiConfig';
import { pluralizeLabel } from '@/lib/uiLabels';
import { useTenantConfig } from '@/hooks/useTenantConfig';
import { useVersionInfo, useHealthStatus } from '@/components/ApiHealthGate';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { AccountDropdown } from '@/components/AccountDropdown';
import { BrandSync } from '@/components/BrandSync';
import { useThemeMode } from '@/theme/ThemeProvider';
import Typography from 'antd/es/typography';
import {
  NAV_SECTIONS,
  NAV_TOP,
  applyNavConfig,
  matchesPath,
  sectionForPath,
  type NavItem,
} from '@/lib/nav';
const { Sider, Header, Content } = AntLayout;
const { Text } = Typography;

// Sprint 54 Phase B (54.2) — sectioned sider.
//
// The taxonomy lives in `src/lib/nav.tsx` as a single registry so a
// route-reachability smoke test (src/lib/nav.test.ts) can walk
// App.tsx and assert every `<Route path>` is either in some section,
// a top-level item, or explicitly allow-listed as reachable elsewhere
// (account dropdown, deep-link from list page, dev-only URL).
//
// Layout shape: ≤2 ungrouped top items (Dashboard, Alerts) above
// ≤4 collapsible SubMenu sections (Asset Tracking, Inventory,
// Data Management, Devices & Telemetry). The SubMenu containing
// the current route is opened by default; users can open / close
// any section freely and switching routes auto-opens the matching
// section without collapsing the others they've toggled open.

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

function modeOk(item: NavItem, enabledModes: Set<string>): boolean {
  if (item.requires === undefined) return true;
  const required = Array.isArray(item.requires) ? item.requires : [item.requires];
  // OR-semantics: visible if ANY listed mode is enabled.
  return required.some((m) => enabledModes.has(m));
}

function filterNav(items: NavItem[], role: string, enabledModes: Set<string>): NavItem[] {
  return items.filter(
    (item) => (ROLE_LEVEL[role] ?? 0) >= (ROLE_LEVEL[item.minRole] ?? 0) && modeOk(item, enabledModes),
  );
}

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, tenantId } = useAuth();
  const { data: tenantConfig } = useTenantConfig();
  const { labels } = useUiConfigContext();
  const navConfig = useNavConfig();
  const versionInfo = useVersionInfo();
  const { degraded, degradedReason, degradedDetail } = useHealthStatus();
  const { mode } = useThemeMode();
  // Branding is best-effort here — the Sider chrome falls back to the
  // tenant name from auth context when /tenant/branding 401s or returns
  // empty overrides.
  const { data: branding } = useTenantBranding(!!user);

  const enabledModes = new Set(tenantConfig?.tracking_modes ?? ['asset', 'inventory']);

  // Role/mode authorization filter first (what the viewer is *allowed* to see),
  // then the Sprint 60 `nav` leaf (ADR-032 §4) further hides/reorders as
  // presentation — config can only restrict, never reveal.
  const roleFilteredTop = filterNav(NAV_TOP, role, enabledModes);
  const roleFilteredSections = NAV_SECTIONS.map((sec) => ({
    ...sec,
    items: filterNav(sec.items, role, enabledModes),
  })).filter((sec) => sec.items.length > 0);
  const { top: topItems, sections } = applyNavConfig(
    roleFilteredTop,
    roleFilteredSections,
    navConfig,
  );

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

  // Sprint 54 Phase B (54.2) — collapsible SubMenu sections.
  // Items with `children:` render as SubMenu in AntD Menu. Collapsed
  // (icon-only) sider mode falls back to popover-on-hover automatically.
  //
  // Sprint 60 (ADR-032 §4) — an item carrying a `labelKey` renders the
  // resolved label skin (pluralized for the nav), so `Device` → `Reader`
  // is configuration, not a code edit; untagged items keep their static label.
  const navItemToMenuItem = ({ key, icon, label, labelKey }: NavItem) => ({
    key,
    icon,
    label: labelKey ? pluralizeLabel(labels[labelKey] ?? label) : label,
  });

  const menuItems: MenuProps['items'] = [
    ...topItems.map(navItemToMenuItem),
    ...sections.map((s) => ({
      key: s.key,
      icon: s.icon,
      // A section carrying a `skinLabel` renders the resolved label skin for
      // its (composite) header, e.g. "Devices & Telemetry" → "Readers &
      // Telemetry"; untagged sections keep their static label.
      label: s.skinLabel ? s.skinLabel(labels) : s.label,
      children: s.items.map(navItemToMenuItem),
    })),
  ];

  const flatItems = [...topItems, ...sections.flatMap((s) => s.items)];
  const selectedKey =
    flatItems
      .filter((item) => matchesPath(item.key, location.pathname))
      .sort((a, b) => b.key.length - a.key.length)[0]?.key ?? '/';

  // openKeys: open the section containing the current route, and keep
  // open any section the user has manually toggled open. Switching to a
  // route in a different section auto-adds that section to openKeys
  // without collapsing the others.
  const initialOpen = useMemo(() => {
    const sec = sectionForPath(location.pathname);
    return sec ? [sec.key] : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [openKeys, setOpenKeys] = useState<string[]>(initialOpen);
  useEffect(() => {
    const sec = sectionForPath(location.pathname);
    if (sec && !openKeys.includes(sec.key)) {
      setOpenKeys((prev) => [...prev, sec.key]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

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
          openKeys={collapsed ? undefined : openKeys}
          onOpenChange={(keys) => setOpenKeys(keys as string[])}
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
