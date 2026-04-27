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
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
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
  { key: '/admin/usage', icon: <BarChartOutlined />, label: 'Usage', minRole: 'admin' as const },
  { key: '/admin/users', icon: <TeamOutlined />, label: 'Users', minRole: 'admin' as const },
];

const ROLE_LEVEL: Record<string, number> = { viewer: 0, editor: 1, admin: 2 };

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, tenantId, logout } = useAuth();

  const menuItems = ALL_MENU_ITEMS.filter(
    (item) => (ROLE_LEVEL[role] ?? 0) >= (ROLE_LEVEL[item.minRole] ?? 0),
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
