import { useMemo, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import Alert from 'antd/es/alert';
import Button from 'antd/es/button';
import InputNumber from 'antd/es/input-number';
import Pagination from 'antd/es/pagination';
import Space from 'antd/es/space';
import Table from 'antd/es/table';
import Typography from 'antd/es/typography';
import Tag from 'antd/es/tag';
import message from 'antd/es/message';
import DownloadOutlined from '@ant-design/icons/DownloadOutlined';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { TagsService } from '@/api/generated/services/TagsService';
import {
  type ReconciliationView,
  useReconciliation,
} from '@/hooks/useReconciliation';
import { ListPageShell } from '@/components/ListPageShell';
import { EmptyState } from '@/components/EmptyState';

dayjs.extend(relativeTime);

const { Text } = Typography;
const PAGE_SIZE = 50;

const VIEW_META: Record<
  ReconciliationView,
  { title: string; description: string; supportsDays: boolean; emptyCopy: (days: number) => string }
> = {
  'registered-unread': {
    title: 'Registered but unread',
    description:
      'Tags in registry status `registered` or `active` that have either never been observed or whose last read is older than the staleness window.',
    supportsDays: true,
    emptyCopy: (days) => `No imported tags have been silent for ${days} days. Healthy registrar.`,
  },
  'unregistered-reading': {
    title: 'Unregistered but reading',
    description:
      'Distinct EPCs the readers have seen in the lookback window that are not present in the tag registry (`tag_known=FALSE`).',
    supportsDays: true,
    emptyCopy: (days) =>
      `No unregistered EPCs reading in the last ${days} days. Either operators are diligent about importing, or no rogue tags are in range.`,
  },
  'bindings-on-retired': {
    title: 'Bindings on retired tags',
    description:
      'Stock-item rows whose EPC binding points to a registry tag in a terminal status (`retired` / `defective` / `transferred_out`).',
    supportsDays: false,
    emptyCopy: () =>
      'No active bindings reference terminal-status tags. Soft-asset / inventory invariants hold.',
  },
};

const VIEWS: ReconciliationView[] = [
  'registered-unread',
  'unregistered-reading',
  'bindings-on-retired',
];

interface RegisteredUnreadRow {
  tag_id: string;
  epc_hex: string;
  status: string;
  source: string;
  first_seen_at: string | null;
  last_seen_at: string | null;
  created_at: string;
}

interface UnregisteredReadingRow {
  tag_id: string;
  last_seen_at: string;
  read_count: number;
}

interface BindingOnRetiredRow {
  stock_item_id: string;
  epc_hex: string;
  product_id: string;
  lot_id: string | null;
  stock_item_state: string;
  tag_id: string;
  tag_status: string;
  tag_updated_at: string;
}

const STATUS_COLOR: Record<string, string> = {
  registered: 'blue',
  active: 'green',
  defective: 'orange',
  retired: 'default',
  transferred_out: 'purple',
};

function tsCell(ts: string | null | undefined) {
  if (!ts) return <Text type="secondary">Never</Text>;
  return (
    <span title={ts}>
      {dayjs(ts).fromNow()}
    </span>
  );
}

function downloadBlob(filename: string, body: string) {
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ReconciliationPage() {
  const { view } = useParams<{ view: string }>();
  const isValid = !!view && VIEWS.includes(view as ReconciliationView);
  const v = (isValid ? view : 'registered-unread') as ReconciliationView;
  const meta = VIEW_META[v];

  const [days, setDays] = useState(30);
  const [page, setPage] = useState(1);
  const [csvBusy, setCsvBusy] = useState(false);

  const offset = (page - 1) * PAGE_SIZE;
  const queryDays = meta.supportsDays ? days : 30;

  const query = useReconciliation<
    RegisteredUnreadRow | UnregisteredReadingRow | BindingOnRetiredRow
  >({ view: v, days: queryDays, limit: PAGE_SIZE, offset });

  const rows = query.data ?? [];
  const fudgedTotal = rows.length === PAGE_SIZE ? page * PAGE_SIZE + 1 : offset + rows.length;

  const columns = useMemo(() => {
    if (v === 'registered-unread') {
      return [
        {
          title: 'EPC',
          dataIndex: 'epc_hex',
          key: 'epc_hex',
          render: (epc: string) => (
            <Link to={`/tags/${epc}`} style={{ fontFamily: 'monospace' }}>
              {epc}
            </Link>
          ),
        },
        {
          title: 'Status',
          dataIndex: 'status',
          key: 'status',
          render: (s: string) => <Tag color={STATUS_COLOR[s] ?? 'default'}>{s}</Tag>,
        },
        { title: 'Source', dataIndex: 'source', key: 'source' },
        {
          title: 'First seen',
          dataIndex: 'first_seen_at',
          key: 'first_seen_at',
          render: (ts: string | null) => tsCell(ts),
        },
        {
          title: 'Last seen',
          dataIndex: 'last_seen_at',
          key: 'last_seen_at',
          render: (ts: string | null) => tsCell(ts),
        },
        {
          title: 'Registered',
          dataIndex: 'created_at',
          key: 'created_at',
          render: (ts: string) => tsCell(ts),
        },
      ];
    }
    if (v === 'unregistered-reading') {
      return [
        {
          title: 'Tag ID',
          dataIndex: 'tag_id',
          key: 'tag_id',
          render: (tid: string) => <span style={{ fontFamily: 'monospace' }}>{tid}</span>,
        },
        {
          title: 'Last seen',
          dataIndex: 'last_seen_at',
          key: 'last_seen_at',
          render: (ts: string) => tsCell(ts),
        },
        { title: 'Read count', dataIndex: 'read_count', key: 'read_count' },
      ];
    }
    return [
      {
        title: 'Stock item',
        dataIndex: 'stock_item_id',
        key: 'stock_item_id',
        render: (id: string) => (
          <Link to={`/inventory/stock-movements?stock_item_id=${id}`} style={{ fontFamily: 'monospace' }}>
            {id.slice(0, 8)}…
          </Link>
        ),
      },
      {
        title: 'EPC',
        dataIndex: 'epc_hex',
        key: 'epc_hex',
        render: (epc: string) => (
          <Link to={`/tags/${epc}`} style={{ fontFamily: 'monospace' }}>
            {epc}
          </Link>
        ),
      },
      { title: 'Stock state', dataIndex: 'stock_item_state', key: 'stock_item_state' },
      {
        title: 'Tag status',
        dataIndex: 'tag_status',
        key: 'tag_status',
        render: (s: string) => <Tag color={STATUS_COLOR[s] ?? 'default'}>{s}</Tag>,
      },
      {
        title: 'Tag updated',
        dataIndex: 'tag_updated_at',
        key: 'tag_updated_at',
        render: (ts: string) => tsCell(ts),
      },
    ];
  }, [v]);

  async function handleCsvDownload() {
    setCsvBusy(true);
    try {
      const body = (await TagsService.getReconciliationViewTagsReconciliationViewGet(
        v,
        queryDays,
        100_000,
        0,
        'csv',
      )) as unknown as string;
      downloadBlob(`reconciliation-${v}-${dayjs().format('YYYYMMDD-HHmm')}.csv`, body);
    } catch (err) {
      const detail =
        (err as { body?: { detail?: string }; message?: string }).body?.detail ??
        (err as { message?: string }).message ??
        'CSV download failed';
      message.error(detail);
    } finally {
      setCsvBusy(false);
    }
  }

  function rowKey(row: RegisteredUnreadRow | UnregisteredReadingRow | BindingOnRetiredRow) {
    if (v === 'registered-unread') return (row as RegisteredUnreadRow).tag_id;
    if (v === 'unregistered-reading') return (row as UnregisteredReadingRow).tag_id;
    return (row as BindingOnRetiredRow).stock_item_id;
  }

  return (
    <>
      {!isValid && <Navigate to="/tags/reconciliation/registered-unread" replace />}
      <ListPageShell
        testId="reconciliation-page"
        title={`Reconciliation — ${meta.title}`}
        count={rows.length}
        countTestId="reconciliation-count"
        description={meta.description}
        primaryAction={
          <Button
            icon={<DownloadOutlined />}
            onClick={handleCsvDownload}
            loading={csvBusy}
            data-testid="reconciliation-csv-btn"
          >
            Download CSV
          </Button>
        }
        toolbar={
          <Space size="middle" wrap>
            <Space>
              {VIEWS.map((vk) => (
                <Link key={vk} to={`/tags/reconciliation/${vk}`}>
                  <Button type={vk === v ? 'primary' : 'default'} size="small">
                    {VIEW_META[vk].title}
                  </Button>
                </Link>
              ))}
            </Space>
            {meta.supportsDays && (
              <Space>
                <Text>Window (days):</Text>
                <InputNumber
                  min={1}
                  max={365}
                  value={days}
                  onChange={(v) => {
                    setPage(1);
                    setDays(typeof v === 'number' ? v : 30);
                  }}
                  data-testid="reconciliation-days"
                />
              </Space>
            )}
          </Space>
        }
      >
        {query.error && (
          <Alert
            type="error"
            message="Failed to load reconciliation view"
            description={String((query.error as { message?: string }).message ?? query.error)}
            style={{ marginBottom: 16 }}
          />
        )}

        <Table
          rowKey={rowKey}
          loading={query.isLoading}
          dataSource={rows}
          columns={columns}
          pagination={false}
          locale={{
            emptyText: (
              <EmptyState title="All clear" description={meta.emptyCopy(queryDays)} />
            ),
          }}
          data-testid="reconciliation-table"
        />

        <Pagination
          style={{ marginTop: 16, textAlign: 'right' }}
          current={page}
          pageSize={PAGE_SIZE}
          total={fudgedTotal}
          showSizeChanger={false}
          onChange={setPage}
        />
      </ListPageShell>
    </>
  );
}

export default ReconciliationPage;
