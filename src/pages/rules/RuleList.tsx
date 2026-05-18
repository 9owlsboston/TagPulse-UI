import Table from 'antd/es/table';
import Tag from 'antd/es/tag';
import Switch from 'antd/es/switch';
import Button from 'antd/es/button';
import Space from 'antd/es/space';
import Typography from 'antd/es/typography';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { useRules, useUpdateRule, useDeleteRule } from '@/hooks/useRules';
import { RoleGuard } from '@/components/RoleGuard';
import { useCanPerform } from '@/components/useCanPerform';
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

  const canEdit = useCanPerform('editor');
  const canDelete = useCanPerform('admin');

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
        <Switch checked={enabled} onChange={(v) => handleToggle(record.id, v)} disabled={!canEdit} />
      ),
    },
    ...(canEdit ? [{
      title: 'Actions',
      render: (_: unknown, record: RuleResponse) => (
        <Space>
          <Button size="small" onClick={() => navigate(`/rules/${record.id}/edit`)}>
            Edit
          </Button>
          {canDelete && (
            <Button size="small" danger onClick={() => handleDelete(record.id)}>
              Delete
            </Button>
          )}
        </Space>
      ),
    }] : []),
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Rules</Title>
        <RoleGuard roles={['admin', 'editor']}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/rules/new')}>
            Create Rule
          </Button>
        </RoleGuard>
      </div>
      <Table rowKey="id" columns={columns} dataSource={data} loading={isLoading} pagination={{ pageSize: 20 }} />
    </div>
  );
}
