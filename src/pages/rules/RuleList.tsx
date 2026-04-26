import { Table, Tag, Switch, Button, Space, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { useRules, useUpdateRule, useDeleteRule } from '@/hooks/useRules';
import type { RuleResponse } from '@/types';

const { Title } = Typography;

export function RuleList() {
  const navigate = useNavigate();
  const { data, isLoading } = useRules();
  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();

  const handleToggle = (id: string, enabled: boolean) => {
    updateRule.mutate({ id, data: { enabled } });
  };

  const handleDelete = (id: string) => {
    deleteRule.mutate(id);
  };

  const columns: ColumnsType<RuleResponse> = [
    { title: 'Name', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    {
      title: 'Condition',
      dataIndex: 'condition_type',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Action',
      dataIndex: 'action_type',
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Enabled',
      dataIndex: 'enabled',
      render: (enabled: boolean, record) => (
        <Switch checked={enabled} onChange={(v) => handleToggle(record.id, v)} />
      ),
    },
    {
      title: 'Actions',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => navigate(`/rules/${record.id}/edit`)}>
            Edit
          </Button>
          <Button size="small" danger onClick={() => handleDelete(record.id)}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Rules</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/rules/new')}>
          Create Rule
        </Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={data} loading={isLoading} pagination={{ pageSize: 20 }} />
    </div>
  );
}
