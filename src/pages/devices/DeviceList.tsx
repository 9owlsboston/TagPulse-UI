import { useState } from 'react';
import { Table, Tag, Input, Select, Space, Typography, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { useDevices } from '@/hooks/useDevices';
import { RoleGuard } from '@/components/RoleGuard';
import type { DeviceResponse } from '@/types';

const { Title } = Typography;
const { Search } = Input;

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Decommissioned', value: 'decommissioned' },
];

const columns: ColumnsType<DeviceResponse> = [
  { title: 'Name', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
  { title: 'Type', dataIndex: 'device_type' },
  {
    title: 'Status',
    dataIndex: 'status',
    render: (status: string) => (
      <Tag color={status === 'active' ? 'green' : 'default'}>{status}</Tag>
    ),
  },
  {
    title: 'Connection',
    dataIndex: 'connection_state',
    render: (state: string) => (
      <Tag color={state === 'online' ? 'green' : 'red'}>{state}</Tag>
    ),
  },
  {
    title: 'Last Seen',
    dataIndex: 'last_seen',
    render: (v: string | null) => (v ? new Date(v).toLocaleString() : '—'),
  },
];

export function DeviceList() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const { data, isLoading } = useDevices({ status: status || undefined });

  const filtered = data?.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Devices</Title>
        <RoleGuard roles={['admin', 'editor']}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/devices/register')}>
            Register Device
          </Button>
        </RoleGuard>
      </div>
      <Space style={{ marginBottom: 16 }}>
        <Search placeholder="Search devices" onSearch={setSearch} allowClear style={{ width: 250 }} />
        <Select options={STATUS_OPTIONS} value={status} onChange={setStatus} style={{ width: 160 }} />
      </Space>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        onRow={(record) => ({ onClick: () => navigate(`/devices/${record.id}`) })}
        style={{ cursor: 'pointer' }}
      />
    </div>
  );
}
