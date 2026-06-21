import Table from 'antd/es/table';
import Tag from 'antd/es/tag';
import Switch from 'antd/es/switch';
import Button from 'antd/es/button';
import Space from 'antd/es/space';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useRules, useUpdateRule, useDeleteRule } from '@/hooks/useRules';
import { useLabel } from '@/lib/uiConfig';
import { RoleGuard } from '@/components/RoleGuard';
import { useCanPerform } from '@/components/useCanPerform';
import { ListPageShell } from '@/components/ListPageShell';
import { EmptyState } from '@/components/EmptyState';
import { SignalingRuleModal } from '@/pages/rules/SignalingRuleModal';
import { excelColumn } from '@/components/ExcelColumn';
import type { RuleResponse } from '@/types';

export function RuleList() {
  const rulesLabel = useLabel('rule', { plural: true });
  const navigate = useNavigate();
  const { data, isLoading } = useRules();
  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();
  // Sprint 41 Phase F2 — primary create flow now opens the SignalingRuleModal;
  // the legacy 4-step wizard at /rules/new is the secondary path under
  // "Legacy rule" tab (F3) for the 10 pre-existing condition types.
  const [signalingModalOpen, setSignalingModalOpen] = useState(false);

  const handleToggle = (id: string, enabled: boolean) => {
    updateRule.mutate({ id, data: { enabled } });
  };

  const canEdit = useCanPerform('editor');
  const canDelete = useCanPerform('admin');

  const handleDelete = (id: string) => {
    deleteRule.mutate(id);
  };

  const columns: ColumnsType<RuleResponse> = [
    { title: 'Name', dataIndex: 'name', ...excelColumn<RuleResponse>({ rows: data ?? [], accessor: (r) => r.name, kind: 'text' }) },
    {
      title: 'Condition',
      dataIndex: 'condition_type',
      ...excelColumn<RuleResponse>({ rows: data ?? [], accessor: (r) => r.condition_type, kind: 'enum' }),
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Action',
      dataIndex: 'action_type',
      ...excelColumn<RuleResponse>({ rows: data ?? [], accessor: (r) => r.action_type, kind: 'enum' }),
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Enabled',
      dataIndex: 'enabled',
      ...excelColumn<RuleResponse>({
        accessor: (r) => (r.enabled ? 'Enabled' : 'Disabled'),
        kind: 'enum',
        options: [
          { text: 'Enabled', value: 'Enabled' },
          { text: 'Disabled', value: 'Disabled' },
        ],
      }),
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

  const rows = data ?? [];

  return (
    <ListPageShell
      testId="rule-list-page"
      title={rulesLabel}
      count={rows.length}
      countTestId="rule-list-count"
      primaryAction={
        <RoleGuard roles={['admin', 'editor']}>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setSignalingModalOpen(true)}
              data-testid="add-alert-rule-button"
            >
              Add alert rule
            </Button>
            <Button onClick={() => navigate('/rules/new')} data-testid="add-legacy-rule-button">
              Legacy rule
            </Button>
          </Space>
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
              title="No rules yet"
              description={
                canEdit
                  ? 'Click "Add alert rule" above to create your first rule.'
                  : 'Ask an editor or admin to create the first rule.'
              }
            />
          ),
        }}
      />
      <SignalingRuleModal
        open={signalingModalOpen}
        onClose={() => setSignalingModalOpen(false)}
      />
    </ListPageShell>
  );
}
