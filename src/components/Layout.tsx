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

// Operator-day nav only. Admin chrome lives in the Account dropdown (QW3)
// so the sidebar stays focused on what crew use minute-to-minute.
const DATA_NAV: NavItem[] = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard', minRole: 'viewer' },
  { key: '/telemetry', icon: <LineChartOutlined />, label: 'Telemetry', minRole: 'viewer' },
  { key: '/telemetry-models', icon: <DatabaseOutlined />, label: 'Telemetry Models', minRole: 'viewer' },
  { key: '/rules', icon: <ThunderboltOutlined />, label: 'Rules', minRole: 'viewer' },
  { key: '/alerts', icon: <AlertOutlined />, label: 'Alerts', minRole: 'viewer' },
  { key: '/integrations', icon: <ApiOutlined />, label: 'Integrations', minRole: 'viewer' },
  { key: '/assets', icon: <TagOutlined />, label: 'Assets', minRole: 'viewer', requires: 'asset' },
  { key: '/categories', icon: <TagsOutlined />, label: 'Categories', minRole: 'viewer' },
  { key: '/sites', icon: <EnvironmentOutlined />, label: 'Locations', minRole: 'viewer', requires: 'asset' },
  { key: '/map', icon: <GlobalOutlined />, label: 'Map', minRole: 'viewer', requires: 'asset' },
];

const EDGE_NAV: NavItem[] = [
  { key: '/devices', icon: <HddOutlined />, label: 'Devices', minRole: 'viewer' },
];

const INVENTORY_NAV: NavItem[] = [
  { key: '/inventory/products', icon: <ShoppingOutlined />, label: 'Products', minRole: 'viewer', requires: 'inventory' },
  { key: '/inventory/lots', icon: <ClockCircleOutlined />, label: 'Lot Expiry', minRole: 'viewer', requires: 'inventory' },
  { key: '/inventory/stock-levels', icon: <AppstoreOutlined />, label: 'Stock Levels', minRole: 'viewer', requires: 'inventory' },
  { key: '/inventory/stock-movements', icon: <SwapOutlined />, label: 'Stock Movements', minRole: 'viewer', requires: 'inventory' },
  { key: '/inventory/csv-import', icon: <UploadOutlined />, label: 'CSV Import', minRole: 'admin', requires: 'inventory' },
];

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

  const dataItems = filterNav(DATA_NAV, role, enabledModes);
  const edgeItems = filterNav(EDGE_NAV, role, enabledModes);
  const inventoryItems = filterNav(INVENTORY_NAV, role, enabledModes);

  // Grouped menu items — DATA / EDGE / INVENTORY headers split the
  // sidebar so operators can scan it by job-to-be-done (QW2).
  const menuItems: MenuProps['items'] = [
    ...(dataItems.length > 0
      ? [
          {
            type: 'group' as const,
            key: 'grp-data',
            label: 'DATA MANAGEMENT',
            children: dataItems.map(({ key, icon, label }) => ({ key, icon, label })),
          },
        ]
      : []),
    ...(edgeItems.length > 0
      ? [
          {
            type: 'group' as const,
            key: 'grp-edge',
            label: 'EDGE MANAGEMENT',
            children: edgeItems.map(({ key, icon, label }) => ({ key, icon, label })),
          },
        ]
      : []),
    ...(inventoryItems.length > 0
      ? [
          {
            type: 'group' as const,
            key: 'grp-inventory',
            label: 'INVENTORY',
            children: inventoryItems.map(({ key, icon, label }) => ({ key, icon, label })),
          },
        ]
      : []),
  ];

  const flatItems = [...dataItems, ...edgeItems, ...inventoryItems];
  const selectedKey =
    flatItems
      .filter((item) =>
        item.key === '/' ? location.pathname === '/' : location.pathname.startsWith(item.key),
      )
      .sort((a, b) => b.key.length - a.key.length)[0]?.key ?? '/';

  // Sider chrome: branding display_name + optional logo (QW6) over
  // a tenant-name fallback. In light mode the Sider is white with the
  // brand blue as accents (QW1); in dark mode the classic dark Sider.
  const siderBg = mode === 'dark' ? '#001529' : '#ffffff';
  const siderTitleColor = mode === 'dark' ? '#fff' : 'rgba(0,0,0,0.85)';
  const siderFooterColor = mode === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const siderBorder = mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #f0f0f0';

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
        width={240}
        theme={mode === 'dark' ? 'dark' : 'light'}
        style={{ position: 'relative', background: siderBg, borderRight: siderBorder }}
      >
        <div
          style={{
            padding: '16px 20px',
            color: siderTitleColor,
            fontWeight: 700,
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
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
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tenantDisplayName}
          </span>
        </div>
        <Menu
          theme={mode === 'dark' ? 'dark' : 'light'}
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ marginBottom: 56, borderRight: 0, background: 'transparent' }}
        />
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
      </Sider>
      <AntLayout>
        <Header
          style={{
            background: mode === 'dark' ? '#141414' : '#fff',
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
