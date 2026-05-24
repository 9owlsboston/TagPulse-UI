/**
 * Pending bulk-operations admin inbox (Sprint 48 Phase F).
 *
 * Surfaces the Sprint 52 backend `GET /bulk-operations` list endpoint
 * (PR #71) plus the per-id `GET` / `approve` / `reject` endpoints already
 * delivered in Sprint 50 Phase C3. Operator B (admin) reviews queued
 * second-admin requests here and approves or rejects them.
 *
 * Per ADR 028 §Governance #4 the approver MUST differ from the requester:
 * the server enforces this and returns 403 `SELF_APPROVAL` when violated.
 * We surface that detail verbatim via `extractServerMessage` so operator B
 * understands why their click was rejected (it's almost always because
 * they queued the request themselves and forgot).
 *
 * The payload bytes (CSV contents) are intentionally NOT surfaced — the
 * review is by `row_count` + `sample` (the same first-10-EPC preview that
 * operator A saw on dry-run). The backend's list endpoint omits `payload`
 * for the same reason: large CSVs are wasteful to ship for triage.
 */
import { useMemo, useState } from 'react';
import Alert from 'antd/es/alert';
import Button from 'antd/es/button';
import Drawer from 'antd/es/drawer';
import Descriptions from 'antd/es/descriptions';
import Empty from 'antd/es/empty';
import Input from 'antd/es/input';
import Pagination from 'antd/es/pagination';
import Select from 'antd/es/select';
import Space from 'antd/es/space';
import Table from 'antd/es/table';
import Tag from 'antd/es/tag';
import Typography from 'antd/es/typography';
import App from 'antd/es/app';
import type { ColumnsType } from 'antd/es/table';
import type { PendingBulkOperationResponse } from '@/api/generated/models/PendingBulkOperationResponse';
import {
  useApprovePendingBulkOperation,
  usePendingBulkOperations,
  useRejectPendingBulkOperation,
} from '@/hooks/usePendingBulkOperations';
import { RoleGuard } from '@/components/RoleGuard';

const { Title, Paragraph, Text } = Typography;
const PAGE_SIZE = 50;

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'executed', label: 'Executed' },
  { value: 'expired', label: 'Expired' },
];

const STATUS_COLOR: Record<string, string> = {
  pending: 'gold',
  approved: 'blue',
  executed: 'green',
  rejected: 'red',
  expired: 'default',
};

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

function extractServerMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const body = (err as { body?: unknown }).body;
    if (body && typeof body === 'object') {
      const detail = (body as { detail?: unknown }).detail;
      if (typeof detail === 'string') return detail;
      if (Array.isArray(detail) && detail.length > 0) {
        const first = detail[0];
        if (first && typeof first === 'object' && 'msg' in first) {
          return String((first as { msg: unknown }).msg);
        }
      }
    }
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return fallback;
}

export function PendingBulkOperations() {
  const { message, modal } = App.useApp();
  const [status, setStatus] = useState<string>('pending');
  const [operation, setOperation] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [selected, setSelected] = useState<PendingBulkOperationResponse | null>(null);

  const offset = (page - 1) * PAGE_SIZE;
  const params = useMemo(
    () => ({
      status: status || undefined,
      operation: operation.trim() || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    [status, operation, offset],
  );

  const { data, isLoading, isError, error } = usePendingBulkOperations(params);
  const approve = useApprovePendingBulkOperation();
  const reject = useRejectPendingBulkOperation();

  const rows = data ?? [];

  // Phase B/D "fudge total" pagination trick — backend returns a bare
  // array, so we assume there's another page whenever the current one
  // is full. Good enough for an inbox that should never be huge.
  const fakeTotal = rows.length === PAGE_SIZE ? offset + PAGE_SIZE + 1 : offset + rows.length;

  const closeDrawer = () => setSelected(null);

  const onApprove = (row: PendingBulkOperationResponse) => {
    modal.confirm({
      title: 'Approve this bulk operation?',
      content: (
        <Paragraph style={{ marginBottom: 0 }}>
          Approving will execute the queued <Text code>{row.operation}</Text> against{' '}
          <Text strong>{row.row_count}</Text> row(s) immediately. This cannot be undone.
        </Paragraph>
      ),
      okText: 'Approve & execute',
      onOk: async () => {
        try {
          await approve.mutateAsync(row.id);
          message.success('Bulk operation approved and executed');
          closeDrawer();
        } catch (err) {
          message.error(extractServerMessage(err, 'Approve failed'));
          throw err;
        }
      },
    });
  };

  const onReject = (row: PendingBulkOperationResponse) => {
    modal.confirm({
      title: 'Reject this bulk operation?',
      content: (
        <Paragraph style={{ marginBottom: 0 }}>
          The queued <Text code>{row.operation}</Text> will be marked rejected and will
          never execute. The requester will need to resubmit if they still want it.
        </Paragraph>
      ),
      okType: 'danger',
      okText: 'Reject',
      onOk: async () => {
        try {
          await reject.mutateAsync(row.id);
          message.success('Bulk operation rejected');
          closeDrawer();
        } catch (err) {
          message.error(extractServerMessage(err, 'Reject failed'));
          throw err;
        }
      },
    });
  };

  const columns: ColumnsType<PendingBulkOperationResponse> = [
    {
      title: 'Requested',
      dataIndex: 'created_at',
      width: 180,
      render: (v: string) => formatTimestamp(v),
    },
    {
      title: 'Operation',
      dataIndex: 'operation',
      width: 160,
      render: (v: string) => <Text code>{v}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 120,
      render: (v: string) => <Tag color={STATUS_COLOR[v] ?? 'default'}>{v}</Tag>,
    },
    {
      title: 'Rows',
      dataIndex: 'row_count',
      width: 80,
      align: 'right',
    },
    {
      title: 'Requested by',
      dataIndex: 'requested_by',
      width: 220,
      render: (v: string | null) => (v ? <Text code>{shortId(v)}</Text> : '—'),
    },
    {
      title: 'Expires',
      dataIndex: 'expires_at',
      width: 180,
      render: (v: string) => formatTimestamp(v),
    },
    {
      title: 'Actions',
      width: 100,
      render: (_, row) => (
        <Button size="small" type="link" onClick={() => setSelected(row)}>
          Review
        </Button>
      ),
    },
  ];

  return (
    <RoleGuard roles={['admin']}>
      <div>
        <Title level={2} style={{ marginTop: 0 }}>
          Pending bulk operations
        </Title>
        <Paragraph type="secondary" style={{ maxWidth: 720 }}>
          Second-admin review queue for bulk operations queued by another administrator
          (ADR 028 §Governance #4). You cannot approve or reject your own request — the
          server will return <Text code>SELF_APPROVAL</Text> if you try.
        </Paragraph>

        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            data-testid="status-filter"
            value={status}
            options={STATUS_OPTIONS}
            style={{ width: 180 }}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          />
          <Input
            data-testid="operation-filter"
            allowClear
            placeholder="Filter by operation (e.g. tag_import)"
            value={operation}
            style={{ width: 320 }}
            onChange={(e) => {
              setOperation(e.target.value);
              setPage(1);
            }}
          />
        </Space>

        {isError ? (
          <Alert
            type="error"
            showIcon
            message="Failed to load pending bulk operations"
            description={extractServerMessage(error, 'Please retry.')}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <Table<PendingBulkOperationResponse>
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={isLoading}
          pagination={false}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  status === 'pending'
                    ? 'Nothing waiting on you. New requests will appear here within 30s.'
                    : 'No bulk operations match these filters.'
                }
              />
            ),
          }}
        />

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Pagination
            current={page}
            pageSize={PAGE_SIZE}
            total={fakeTotal}
            showSizeChanger={false}
            onChange={setPage}
          />
        </div>

        <Drawer
          title="Review bulk operation"
          width={560}
          open={selected !== null}
          onClose={closeDrawer}
          destroyOnClose
          footer={
            selected && selected.status === 'pending' ? (
              <Space>
                <Button onClick={closeDrawer}>Cancel</Button>
                <Button danger loading={reject.isPending} onClick={() => onReject(selected)}>
                  Reject
                </Button>
                <Button
                  type="primary"
                  loading={approve.isPending}
                  onClick={() => onApprove(selected)}
                >
                  Approve & execute
                </Button>
              </Space>
            ) : null
          }
        >
          {selected ? (
            <>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="ID">
                  <Text code>{selected.id}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Operation">
                  <Text code>{selected.operation}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={STATUS_COLOR[selected.status] ?? 'default'}>{selected.status}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Row count">{selected.row_count}</Descriptions.Item>
                <Descriptions.Item label="Requested by">
                  <Text code>{selected.requested_by ?? '—'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Requested at">
                  {formatTimestamp(selected.created_at)}
                </Descriptions.Item>
                <Descriptions.Item label="Expires at">
                  {formatTimestamp(selected.expires_at)}
                </Descriptions.Item>
                <Descriptions.Item label="Decided by">
                  <Text code>{selected.decided_by ?? '—'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Decided at">
                  {formatTimestamp(selected.decided_at)}
                </Descriptions.Item>
                <Descriptions.Item label="Executed at">
                  {formatTimestamp(selected.executed_at)}
                </Descriptions.Item>
                <Descriptions.Item label="Content hash">
                  <Text code style={{ wordBreak: 'break-all' }}>
                    {selected.content_hash}
                  </Text>
                </Descriptions.Item>
              </Descriptions>

              <Title level={5} style={{ marginTop: 24 }}>
                Sample EPCs ({selected.sample.length} of {selected.row_count})
              </Title>
              {selected.sample.length > 0 ? (
                <pre
                  data-testid="sample-epcs"
                  style={{
                    background: 'rgba(0,0,0,0.04)',
                    padding: 12,
                    maxHeight: 240,
                    overflow: 'auto',
                    fontSize: 12,
                    margin: 0,
                  }}
                >
                  {selected.sample.join('\n')}
                </pre>
              ) : (
                <Text type="secondary">No sample available.</Text>
              )}

              {selected.status !== 'pending' ? (
                <Alert
                  style={{ marginTop: 16 }}
                  type="info"
                  showIcon
                  message="This operation is no longer pending"
                  description="Approve / reject actions are only available for pending operations."
                />
              ) : null}
            </>
          ) : null}
        </Drawer>
      </div>
    </RoleGuard>
  );
}

export default PendingBulkOperations;
