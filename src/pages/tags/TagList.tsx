import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from 'antd/es/input';
import Segmented from 'antd/es/segmented';
import Select from 'antd/es/select';
import Space from 'antd/es/space';
import Table from 'antd/es/table';
import Tag from 'antd/es/tag';
import Typography from 'antd/es/typography';
import { useTags, type TagListParams } from '@/hooks/useTags';
import { useLabel } from '@/lib/uiConfig';
import { ListPageShell } from '@/components/ListPageShell';
import { columnSearchFilter } from '@/components/ColumnSearchFilter';
import { EmptyState } from '@/components/EmptyState';
import { TagResponse } from '@/api/generated/models/TagResponse';

const { Text } = Typography;

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'registered', label: 'Registered' },
  { value: 'active', label: 'Active' },
  { value: 'retired', label: 'Retired' },
  { value: 'defective', label: 'Defective' },
  { value: 'transferred_out', label: 'Transferred out' },
];

// Per Sprint 51 Phase A design doc §3.1 — colour by tag lifecycle stage.
// `transferred_out` uses purple so it stands apart from `retired` (default)
// even though both are terminal — operators triage them differently.
const STATUS_COLOR: Record<string, string> = {
  registered: 'blue',
  active: 'green',
  retired: 'default',
  defective: 'orange',
  transferred_out: 'purple',
};

const SOURCE_LABEL: Record<string, string> = {
  csv_import: 'CSV import',
  api: 'API',
  backfill: 'Backfill',
  transfer_in: 'Transfer in',
};

const BOUND_OPTIONS: { label: string; value: 'all' | 'bound' | 'unbound' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Bound', value: 'bound' },
  { label: 'Unbound', value: 'unbound' },
];

const PAGE_SIZE = 50;

function formatRelative(iso: string | null): string {
  if (!iso) return 'Never';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const ms = Date.now() - then;
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

/**
 * Sprint 44 Phase B — tag registry list page (`/tags`).
 *
 * Surfaces the Sprint 50 backend `GET /tags` endpoint as a paginated,
 * filterable table. The `tag_known=NULL` UX policy locked in the design
 * doc (§3.1) means this list is over the `tags` registry table only —
 * unclassified reads never surface here; they only appear in the
 * reconciliation views (Phase E).
 */
export function TagList() {
  const tagsLabel = useLabel('tag', { plural: true });
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [epcPrefix, setEpcPrefix] = useState('');
  const [bound, setBound] = useState<'all' | 'bound' | 'unbound'>('all');
  const [epcQ, setEpcQ] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const params: TagListParams = useMemo(
    () => ({
      status: status || undefined,
      epc_prefix: epcPrefix.trim() || undefined,
      bound: bound === 'all' ? undefined : bound === 'bound',
      q: epcQ,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    [status, epcPrefix, bound, epcQ, page],
  );

  const { data, isLoading, isFetching } = useTags(params);
  const rows = data ?? [];
  // The list endpoint doesn't return a total count — show "more" hint when
  // a full page comes back, fall back to known total otherwise.
  const hasMore = rows.length === PAGE_SIZE;

  const columns = [
    {
      title: 'EPC (hex)',
      dataIndex: 'epc_hex',
      key: 'epc_hex',
      ...columnSearchFilter<TagResponse>({
        mode: 'server',
        value: epcQ,
        onSearch: setEpcQ,
        placeholder: 'e.g. 3034*',
      }),
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
      render: (s: string) => <Tag color={STATUS_COLOR[s] ?? 'default'}>{s}</Tag>,
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      render: (s: string) => SOURCE_LABEL[s] ?? s,
    },
    {
      title: 'First seen',
      dataIndex: 'first_seen_at',
      key: 'first_seen_at',
      render: (v: string | null) => formatRelative(v),
    },
    {
      title: 'Last seen',
      dataIndex: 'last_seen_at',
      key: 'last_seen_at',
      render: (v: string | null) => formatRelative(v),
    },
  ];

  return (
    <ListPageShell
      testId="tag-list-page"
      title={tagsLabel}
      titleLevel={3}
      description={
        <Text type="secondary">
          Tag registry (ADR 028). Imported and observed EPCs with lifecycle status.
          Reads pending classification do not appear here — see the reconciliation views
          under Tags → Reconciliation.
        </Text>
      }
      toolbar={
        <Space wrap size="middle">
          <Select
            aria-label="Filter by status"
            value={status}
            style={{ width: 200 }}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={STATUS_OPTIONS}
          />
          <Input.Search
            aria-label="Filter by EPC prefix"
            placeholder="EPC prefix (hex)"
            allowClear
            style={{ width: 280 }}
            onSearch={(v) => {
              setEpcPrefix(v);
              setPage(1);
            }}
          />
          <Segmented
            aria-label="Binding filter"
            options={BOUND_OPTIONS}
            value={bound}
            onChange={(v) => {
              setBound(v as 'all' | 'bound' | 'unbound');
              setPage(1);
            }}
          />
        </Space>
      }
    >
      <Table<TagResponse>
          rowKey="id"
          dataSource={rows}
          loading={isLoading || isFetching}
          columns={columns}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            onChange: setPage,
            // Hide the page-size selector — server pages are fixed-size.
            showSizeChanger: false,
            // We don't know the true total; render "more pages" by
            // overstating when a full page came back, otherwise the
            // current page is exact.
            total: hasMore ? page * PAGE_SIZE + 1 : (page - 1) * PAGE_SIZE + rows.length,
            showTotal: (_, [from, to]) =>
              hasMore
                ? `Showing ${from}–${to} (more available)`
                : `Showing ${from}–${to} of ${(page - 1) * PAGE_SIZE + rows.length}`,
          }}
          onRow={(record) => ({
            onClick: () => navigate(`/tags/${record.epc_hex}`),
            style: { cursor: 'pointer' },
          })}
        locale={{
          emptyText:
            status || epcPrefix || bound !== 'all' ? (
              <EmptyState
                title="No tags match these filters"
                description="Try clearing the status, EPC prefix, or binding filters."
              />
            ) : (
              <EmptyState
                title="No tags registered yet"
                description="Import a CSV or wait for the registrar to classify reads."
              />
            ),
        }}
      />
    </ListPageShell>
  );
}
