import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from 'antd/es/button';
import Segmented from 'antd/es/segmented';
import Select from 'antd/es/select';
import Space from 'antd/es/space';
import Table from 'antd/es/table';
import Tag from 'antd/es/tag';
import Typography from 'antd/es/typography';
import { PlusOutlined } from '@ant-design/icons';
import type { TagTransferResponse } from '@/api/generated/models/TagTransferResponse';
import { useTransfers, type TransferListParams } from '@/hooks/useTransfers';
import { useLabel } from '@/lib/uiConfig';
import { useCanPerform } from '@/components/useCanPerform';
import { NewTransferModal } from '@/pages/transfers/NewTransferModal';
import { ListPageShell } from '@/components/ListPageShell';
import { EmptyState } from '@/components/EmptyState';

const { Text } = Typography;

const STATUS_COLOR: Record<string, string> = {
  requested: 'blue',
  completed: 'green',
  failed: 'red',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'requested', label: 'Requested' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

const DIRECTION_OPTIONS: { label: string; value: 'outbound' | 'inbound' }[] = [
  { label: 'Outbound', value: 'outbound' },
  { label: 'Inbound', value: 'inbound' },
];

const PAGE_SIZE = 50;

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

/**
 * Sprint 46 Phase D — cross-tenant transfer queue.
 *
 * Lists transfer rows for the calling tenant. Direction defaults to
 * `outbound` because operators reach this page from the tag registry
 * after initiating a transfer — checking "did my request land?" is the
 * dominant case. Toggle to `inbound` to see transfers other tenants
 * have initiated to this tenant (Phase D ships the read-only view; the
 * ack/reject path lives in Sprint 51b backend gap #3).
 */
export function TransferList() {
  const tagLabel = useLabel('tag');
  const navigate = useNavigate();
  const canCreate = useCanPerform('editor');
  const [searchParams] = useSearchParams();
  const [direction, setDirection] = useState<'outbound' | 'inbound'>('outbound');
  const [status, setStatus] = useState<string>(() => {
    // Sprint 54.4 — dashboard "Transfers in flight" tile deep-links with
    // ?status=requested. Direction is always outbound on entry because the
    // KPI count is operator-actionable from their own initiations first.
    const s = searchParams.get('status') ?? '';
    return ['requested', 'completed', 'failed'].includes(s) ? s : '';
  });
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const s = searchParams.get('status') ?? '';
    if (['requested', 'completed', 'failed', ''].includes(s)) setStatus(s);
  }, [searchParams]);

  const params = useMemo<TransferListParams>(
    () => ({
      direction,
      status: status || undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    [direction, status, page],
  );

  const { data, isLoading, error, refetch } = useTransfers(params);
  const rows = data ?? [];

  const columns = [
    {
      title: 'EPC',
      dataIndex: 'epc_hex',
      key: 'epc_hex',
      render: (epc: string) => (
        <Text code style={{ cursor: 'pointer' }} onClick={() => navigate(`/tags/${epc}`)}>
          {epc}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (s: string) => <Tag color={STATUS_COLOR[s] ?? 'default'}>{s}</Tag>,
    },
    {
      title: direction === 'outbound' ? 'To tenant' : 'From tenant',
      key: 'counterparty',
      render: (_: unknown, row: TagTransferResponse) =>
        direction === 'outbound' ? (
          <Text code>{row.to_tenant_id}</Text>
        ) : (
          <Text code>{row.from_tenant_id}</Text>
        ),
    },
    {
      title: 'Request ID',
      dataIndex: 'request_id',
      key: 'request_id',
      render: (id: string) => <Text code>{id.slice(0, 8)}…</Text>,
    },
    {
      title: 'Requested',
      dataIndex: 'requested_at',
      key: 'requested_at',
      render: formatTimestamp,
    },
    {
      title: 'Completed',
      dataIndex: 'completed_at',
      key: 'completed_at',
      render: formatTimestamp,
    },
    {
      title: 'Failure reason',
      dataIndex: 'failure_reason',
      key: 'failure_reason',
      render: (v: string | null) => (v ? <Text type="danger">{v}</Text> : '—'),
    },
  ];

  return (
    <>
      <ListPageShell
        testId="transfer-list-page"
        title={`${tagLabel} transfers`}
        count={rows.length}
        countTestId="transfer-list-count"
        description="Cross-tenant transfers of EPCs (ADR 028 §Transfers). Outbound rows show transfers this tenant initiated; inbound rows show transfers other tenants have requested to this tenant. Receiving-tenant acknowledgement lands in a later sprint."
        primaryAction={
          canCreate ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalOpen(true)}
              data-testid="transfer-list-new-btn"
            >
              New transfer
            </Button>
          ) : undefined
        }
        toolbar={
          <Space wrap>
            <Segmented
              options={DIRECTION_OPTIONS}
              value={direction}
              onChange={(v) => {
                setDirection(v as 'outbound' | 'inbound');
                setPage(1);
              }}
            />
            <Select
              style={{ width: 200 }}
              value={status}
              options={STATUS_OPTIONS}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              data-testid="transfer-list-status-filter"
            />
          </Space>
        }
      >
        {error ? (
          <Text type="danger">Failed to load transfers. {String(error)}</Text>
        ) : (
          <Table<TagTransferResponse>
            rowKey="id"
            size="small"
            loading={isLoading}
            columns={columns}
            dataSource={rows}
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total: rows.length === PAGE_SIZE ? page * PAGE_SIZE + 1 : (page - 1) * PAGE_SIZE + rows.length,
              showSizeChanger: false,
              onChange: setPage,
            }}
            locale={{
              emptyText: status ? (
                <EmptyState
                  title="No transfers match this status"
                  description="Try clearing the status filter or switching direction."
                />
              ) : direction === 'outbound' ? (
                <EmptyState
                  title="No outbound transfers yet"
                  description={canCreate ? 'Initiate a transfer from a tag detail page or "New transfer".' : 'Transfers this tenant initiates will appear here.'}
                />
              ) : (
                <EmptyState
                  title="No inbound transfers yet"
                  description="Transfers other tenants initiate to this tenant will appear here."
                />
              ),
            }}
          />
        )}
      </ListPageShell>

      <NewTransferModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          refetch();
        }}
      />
    </>
  );
}
