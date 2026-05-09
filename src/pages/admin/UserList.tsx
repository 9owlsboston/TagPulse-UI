import { Table, Tag, Button, Space, Typography, App } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { useUsers, useUpdateUser } from '@/hooks/useUsers';
import type { UserResponse } from '@/types';

const { Title } = Typography;

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
    { title: 'Name', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'Email', dataIndex: 'email' },
    {
      title: 'Role',
      dataIndex: 'role',
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'red' : role === 'editor' ? 'blue' : 'default'}>{role}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Users</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/users/new')}>
          Create User
        </Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={data} loading={isLoading} pagination={{ pageSize: 20 }} />
    </div>
  );
}
