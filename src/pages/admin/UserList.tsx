import Table from 'antd/es/table';
import Tag from 'antd/es/tag';
import Button from 'antd/es/button';
import Space from 'antd/es/space';
import App from 'antd/es/app';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { useUsers, useUpdateUser } from '@/hooks/useUsers';
import { ListPageShell } from '@/components/ListPageShell';
import { EmptyState } from '@/components/EmptyState';
import { RoleGuard } from '@/components/RoleGuard';
import { excelColumn } from '@/components/ExcelColumn';
import type { UserResponse } from '@/types';

export function UserList() {
  const navigate = useNavigate();
  const { modal, message } = App.useApp();
  const { data, isLoading } = useUsers();
  const updateUser = useUpdateUser();

  const handleToggleStatus = (user: UserResponse) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    modal.confirm({
      title: `${newStatus === 'inactive' ? 'Deactivate' : 'Reactivate'} User`,
      content: `Are you sure you want to ${newStatus === 'inactive' ? 'deactivate' : 'reactivate'} ${user.name}?`,
      okType: newStatus === 'inactive' ? 'danger' : 'primary',
      onOk: async () => {
        await updateUser.mutateAsync({ id: user.id, data: { status: newStatus } });
        message.success(`User ${newStatus === 'inactive' ? 'deactivated' : 'reactivated'}`);
      },
    });
  };

  const columns: ColumnsType<UserResponse> = [
    { title: 'Name', dataIndex: 'name', ...excelColumn<UserResponse>({ rows: data ?? [], accessor: (r) => r.name, kind: 'text' }) },
    { title: 'Email', dataIndex: 'email', ...excelColumn<UserResponse>({ rows: data ?? [], accessor: (r) => r.email, kind: 'text' }) },
    {
      title: 'Role',
      dataIndex: 'role',
      ...excelColumn<UserResponse>({ rows: data ?? [], accessor: (r) => r.role, kind: 'enum' }),
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'red' : role === 'editor' ? 'blue' : 'default'}>{role}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      ...excelColumn<UserResponse>({ rows: data ?? [], accessor: (r) => r.status, kind: 'enum' }),
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>{status}</Tag>
      ),
    },
    {
      title: 'API Key',
      dataIndex: 'api_key_prefix',
      render: (prefix: string | null) => prefix ? <code>{prefix}...</code> : '—',
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      ...excelColumn<UserResponse>({ rows: data ?? [], accessor: (r) => r.created_at, kind: 'date' }),
      render: (v: string) => new Date(v).toLocaleDateString(),
    },
    {
      title: 'Actions',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => navigate(`/admin/users/${record.id}`)}>
            Edit
          </Button>
          <Button
            size="small"
            danger={record.status === 'active'}
            onClick={() => handleToggleStatus(record)}
          >
            {record.status === 'active' ? 'Deactivate' : 'Reactivate'}
          </Button>
        </Space>
      ),
    },
  ];

  const rows = data ?? [];

  return (
    <ListPageShell
      testId="user-list-page"
      title="Users"
      count={rows.length}
      countTestId="user-list-count"
      primaryAction={
        <RoleGuard roles={['admin']}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/users/new')}>
            Create User
          </Button>
        </RoleGuard>
      }
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={isLoading}
        pagination={{ defaultPageSize: 20, showSizeChanger: true, pageSizeOptions: [20, 50, 100] }}
        locale={{
          emptyText: (
            <EmptyState
              title="No users yet"
              description="Create the first user to grant access to this tenant."
            />
          ),
        }}
      />
    </ListPageShell>
  );
}
