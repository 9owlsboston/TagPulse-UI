import { Layout as AntLayout, Menu } from 'antd';
import {
  DashboardOutlined,
  HddOutlined,
  LineChartOutlined,
  ThunderboltOutlined,
  AlertOutlined,
  ApiOutlined,
  BarChartOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button, Typography } from 'antd';

const { Sider, Header, Content } = AntLayout;
const { Text } = Typography;

const MENU_ITEMS = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/devices', icon: <HddOutlined />, label: 'Devices' },
  { key: '/telemetry', icon: <LineChartOutlined />, label: 'Telemetry' },
  { key: '/telemetry-models', icon: <DatabaseOutlined />, label: 'Telemetry Models' },
  { key: '/rules', icon: <ThunderboltOutlined />, label: 'Rules' },
  { key: '/alerts', icon: <AlertOutlined />, label: 'Alerts' },
  { key: '/integrations', icon: <ApiOutlined />, label: 'Integrations' },
  { key: '/admin/usage', icon: <BarChartOutlined />, label: 'Usage' },
];

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tenantId, logout } = useAuth();

  const selectedKey = MENU_ITEMS.find((item) =>
    item.key === '/' ? location.pathname === '/' : location.pathname.startsWith(item.key),
  )?.key ?? '/';

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
          items={MENU_ITEMS}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <AntLayout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
          <Text type="secondary">Tenant: {tenantId}</Text>
          <Button size="small" onClick={logout}>Logout</Button>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
