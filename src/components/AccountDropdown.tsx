/**
 * AccountDropdown — Sprint 33 QW3.
 *
 * Top-right user-account dropdown extracted from the Header. Holds:
 *   • The user's display name + tenant + role badge.
 *   • Dark-mode toggle (QW5) — bound to `useThemeMode`.
 *   • Admin-only links: Tenant Settings, Branding, Usage, Users,
 *     Audit Log, Dead Letters. These used to live in the sidebar and
 *     drowned the operator-day nav under admin chrome.
 *   • Logout.
 *
 * Unauthenticated state (the tenant-id viewer flow) renders a minimal
 * "Viewer" pill instead, since no user object is available.
 */
import Avatar from 'antd/es/avatar';
import Dropdown from 'antd/es/dropdown';
import Space from 'antd/es/space';
import Switch from 'antd/es/switch';
import Tag from 'antd/es/tag';
import Typography from 'antd/es/typography';
import {
  AuditOutlined,
  BarChartOutlined,
  BulbOutlined,
  FormatPainterOutlined,
  LogoutOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useThemeMode } from '@/theme/ThemeProvider';

const { Text } = Typography;

const ROLE_LEVEL: Record<'viewer' | 'editor' | 'admin', number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
};

export function AccountDropdown() {
  const { user, role, tenantId, logout } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const navigate = useNavigate();

  const isAdmin = (ROLE_LEVEL[role] ?? 0) >= ROLE_LEVEL.admin;
  const displayName = user?.name ?? 'Viewer';
  const tenantLabel = user?.tenant_name ?? tenantId ?? '—';
  const roleColor = role === 'admin' ? 'red' : role === 'editor' ? 'blue' : 'default';

  const items: MenuProps['items'] = [
    {
      key: 'profile',
      type: 'group',
      label: (
        <div style={{ padding: '4px 0' }}>
          <Text strong>{displayName}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {tenantLabel}
          </Text>
          <br />
          <Tag color={roleColor} style={{ marginTop: 4 }}>
            {role}
          </Tag>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'theme',
      icon: <BulbOutlined />,
      label: (
        // stopPropagation so toggling the switch doesn't also close the menu.
        <span
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          Dark mode
          <Switch
            size="small"
            checked={mode === 'dark'}
            onChange={toggleMode}
            data-testid="theme-toggle"
          />
        </span>
      ),
    },
    ...(isAdmin
      ? ([
          { type: 'divider' as const },
          { key: '/admin/tenant', icon: <SettingOutlined />, label: 'Tenant Settings' },
          { key: '/admin/branding', icon: <FormatPainterOutlined />, label: 'Branding' },
          { key: '/admin/usage', icon: <BarChartOutlined />, label: 'Usage' },
          { key: '/admin/users', icon: <TeamOutlined />, label: 'Users' },
          { key: '/admin/audit-logs', icon: <AuditOutlined />, label: 'Audit Log' },
          { key: '/admin/dead-letters', icon: <WarningOutlined />, label: 'Dead Letters' },
          { key: '/admin/pending-bulk-operations', icon: <AuditOutlined />, label: 'Pending Bulk Ops' },
        ] satisfies MenuProps['items'])
      : []),
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
    },
  ];

  const onClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      logout();
      return;
    }
    if (key === 'theme') return;
    if (key.startsWith('/')) navigate(key);
  };

  return (
    <Dropdown
      menu={{ items, onClick }}
      trigger={['click']}
      placement="bottomRight"
    >
      <Space style={{ cursor: 'pointer' }} data-testid="account-trigger">
        <Avatar icon={<UserOutlined />} size="small" />
        <Text>{displayName}</Text>
      </Space>
    </Dropdown>
  );
}
