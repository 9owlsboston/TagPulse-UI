import { Layout as AntLayout, Menu, Tag } from 'antd';
import {
  DashboardOutlined,
  HddOutlined,
  LineChartOutlined,
  ThunderboltOutlined,
  AlertOutlined,
  ApiOutlined,
  BarChartOutlined,
  DatabaseOutlined,
  TeamOutlined,
  ShoppingOutlined,
  AppstoreOutlined,
  SwapOutlined,
  ClockCircleOutlined,
  TagOutlined,
  EnvironmentOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTenantConfig } from '@/hooks/useTenantConfig';
import { Button, Typography } from 'antd';

const { Sider, Header, Content } = AntLayout;
const { Text } = Typography;

const ALL_MENU_ITEMS = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard', minRole: 'viewer' as const },
  { key: '/devices', icon: <HddOutlined />, label: 'Devices', minRole: 'viewer' as const },
  { key: '/telemetry', icon: <LineChartOutlined />, label: 'Telemetry', minRole: 'viewer' as const },
  { key: '/telemetry-models', icon: <DatabaseOutlined />, label: 'Telemetry Models', minRole: 'viewer' as const },
  { key: '/rules', icon: <ThunderboltOutlined />, label: 'Rules', minRole: 'viewer' as const },
  { key: '/alerts', icon: <AlertOutlined />, label: 'Alerts', minRole: 'viewer' as const },
  { key: '/integrations', icon: <ApiOutlined />, label: 'Integrations', minRole: 'viewer' as const },
  { key: '/assets', icon: <TagOutlined />, label: 'Assets', minRole: 'viewer' as const, requires: 'asset' as const },
  { key: '/sites', icon: <EnvironmentOutlined />, label: 'Sites & Zones', minRole: 'viewer' as const, requires: 'asset' as const },
  { key: '/inventory/products', icon: <ShoppingOutlined />, label: 'Products', minRole: 'viewer' as const, requires: 'inventory' as const },
  { key: '/inventory/lots', icon: <ClockCircleOutlined />, label: 'Lot Expiry', minRole: 'viewer' as const, requires: 'inventory' as const },
  { key: '/inventory/stock-levels', icon: <AppstoreOutlined />, label: 'Stock Levels', minRole: 'viewer' as const, requires: 'inventory' as const },
  { key: '/inventory/stock-movements', icon: <SwapOutlined />, label: 'Stock Movements', minRole: 'viewer' as const, requires: 'inventory' as const },
  { key: '/admin/tenant', icon: <SettingOutlined />, label: 'Tenant Settings', minRole: 'admin' as const },
  { key: '/admin/usage', icon: <BarChartOutlined />, label: 'Usage', minRole: 'admin' as const },
  { key: '/admin/users', icon: <TeamOutlined />, label: 'Users', minRole: 'admin' as const },
];

const ROLE_LEVEL: Record<string, number> = { viewer: 0, editor: 1, admin: 2 };

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, tenantId, logout } = useAuth();
  const { data: tenantConfig } = useTenantConfig();
  const enabledModes = new Set(tenantConfig?.tracking_modes ?? ['asset', 'inventory']);

  const menuItems = ALL_MENU_ITEMS.filter(
    (item) =>
      (ROLE_LEVEL[role] ?? 0) >= (ROLE_LEVEL[item.minRole] ?? 0) &&
      (item.requires === undefined || enabledModes.has(item.requires)),
  );

  const selectedKey = menuItems.filter((item) =>
    item.key === '/' ? location.pathname === '/' : location.pathname.startsWith(item.key),
  ).sort((a, b) => b.key.length - a.key.length)[0]?.key ?? '/';

  const roleColor = role === 'admin' ? 'red' : role === 'editor' ? 'blue' : 'default';

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider width={220}>
        <div style={{ padding: '16px 24px', color: '#fff', fontWeight: 700, fontSize: 18 }}>
          TagPulse
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <AntLayout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
          {user ? (
            <>
              <Text>{user.name}</Text>
              <Tag color={roleColor}>{role}</Tag>
              <Text type="secondary">{user.tenant_name}</Text>
            </>
          ) : (
            <>
              <Text type="secondary">Tenant: {tenantId}</Text>
              <Tag>viewer</Tag>
            </>
          )}
          <Button size="small" onClick={logout}>Logout</Button>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
