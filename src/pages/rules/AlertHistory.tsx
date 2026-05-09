import { useMemo, useState } from 'react';
import { Table, Tag, Button, Space, Typography, Input, DatePicker, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { useAlerts, useAcknowledgeAlert } from '@/hooks/useAlerts';
import { useCanPerform } from '@/components/useCanPerform';
import { alertsApi } from '@/api/client';
import type { AlertResponse } from '@/types';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const SEVERITY_FILTERS = [
  { text: 'Critical', value: 'critical' },
  { text: 'Warning', value: 'warning' },
  { text: 'Info', value: 'info' },
];

const RANGE_PRESETS: { label: string; value: [Dayjs, Dayjs] }[] = [
  { label: 'Last hour', value: [dayjs().subtract(1, 'hour'), dayjs()] },
  { label: 'Last 24 hours', value: [dayjs().subtract(24, 'hour'), dayjs()] },
  { label: 'Last 7 days', value: [dayjs().subtract(7, 'day'), dayjs()] },
  { label: 'Last 30 days', value: [dayjs().subtract(30, 'day'), dayjs()] },
];

export function AlertHistory() {
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const { data, isLoading } = useAlerts();
  const acknowledge = useAcknowledgeAlert();
  const canAcknowledge = useCanPerform('editor');

  // Build device filter dropdown from the current page of alerts (client-side).
  const deviceFilters = useMemo(() => {
    const seen = new Set<string>();
    for (const a of data ?? []) {
      if (a.device_id) seen.add(a.device_id);
    }
    return Array.from(seen)
      .sort()
      .map((id) => ({ text: id, value: id }));
  }, [data]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const from = range?.[0]?.valueOf();
    const to = range?.[1]?.valueOf();
    return (data ?? []).filter((a) => {
      if (needle && !a.message.toLowerCase().includes(needle)) return false;
      if (from || to) {
        const ts = new Date(a.triggered_at).getTime();
        if (from && ts < from) return false;
        if (to && ts > to) return false;
      }
      return true;
    });
  }, [data, search, range]);

  // Only open alerts can be selected for bulk ack
  const selectableRows = useMemo(
    () => filtered.filter((a) => a.status === 'open'),
    [filtered],
  );

  const handleBulkAcknowledge = async () => {
    if (selected.length === 0) return;
    setBulkLoading(true);
    const results = await Promise.allSettled(
      selected.map((id) => alertsApi.acknowledge(id)),
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    acknowledge.reset?.();
    // Force refetch
    setBulkLoading(false);
    setSelected([]);
    message.success(`${ok}/${selected.length} alerts acknowledged`);
    // Invalidate to refresh
    window.location.reload();
  };

  const columns: ColumnsType<AlertResponse> = [
    {
      title: 'Time',
      dataIndex: 'triggered_at',
      render: (v: string) => new Date(v).toLocaleString(),
      sorter: (a, b) => new Date(a.triggered_at).getTime() - new Date(b.triggered_at).getTime(),
      defaultSortOrder: 'descend',
      width: 200,
    },
    { title: 'Message', dataIndex: 'message' },
    {
      title: 'Severity',
      dataIndex: 'severity',
      width: 120,
      filters: SEVERITY_FILTERS,
      onFilter: (value, record) => record.severity === value,
      render: (v: string) => (
        <Tag color={v === 'critical' ? 'red' : v === 'warning' ? 'orange' : 'blue'}>{v}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 140,
      filters: [
        { text: 'Open', value: 'open' },
        { text: 'Acknowledged', value: 'acknowledged' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (v: string) => (
        <Tag color={v === 'open' ? 'red' : 'green'}>{v}</Tag>
      ),
    },
    {
      title: 'Subject',
      key: 'subject',
      width: 200,
      render: (_: unknown, record: AlertResponse) => {
        const ctx = (record.context ?? {}) as Record<string, unknown>;
        const kind = ctx.subject_kind as string | undefined;
        const subjectId = ctx.subject_id as string | undefined;
        if (!kind || !subjectId) return <Typography.Text type="secondary">—</Typography.Text>;
        const href =
          kind === 'asset'
            ? `/assets/${subjectId}`
            : kind === 'lot'
              ? `/inventory/lots/${subjectId}`
              : kind === 'device'
                ? `/devices/${subjectId}`
                : null;
        const label = (
          <Space size={4}>
            <Tag color="geekblue">{kind}</Tag>
            <code style={{ fontSize: 12 }}>{subjectId.slice(0, 8)}…</code>
          </Space>
        );
        return href ? <Link to={href} title={subjectId}>{label}</Link> : label;
      },
    },
    {
      title: 'Device',
      dataIndex: 'device_id',
      width: 220,
      filters: deviceFilters.length > 0 ? deviceFilters : undefined,
      onFilter: (value, record) => record.device_id === value,
      render: (v: string | null) =>
        v ? (
          <Link to={`/devices/${v}`} title={v}>
            <code style={{ fontSize: 12 }}>{v.slice(0, 8)}…</code>
          </Link>
        ) : (
          '—'
        ),
    },
    {
      title: 'Actions',
      width: 140,
      render: (_, record) =>
        record.status === 'open' && canAcknowledge ? (
          <Button
            size="small"
            onClick={() => acknowledge.mutate(record.id)}
            loading={acknowledge.isPending}
          >
            Acknowledge
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <Title level={2}>Alert History</Title>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="Search message…"
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 260 }}
        />
        <RangePicker
          showTime
          allowClear
          value={range as [Dayjs, Dayjs] | null}
          onChange={(v) => setRange(v as [Dayjs | null, Dayjs | null] | null)}
          presets={RANGE_PRESETS}
          style={{ width: 380 }}
        />
        <Typography.Text type="secondary">
          {filtered.length} of {data?.length ?? 0}
        </Typography.Text>
        {canAcknowledge && selected.length > 0 && (
          <Button type="primary" onClick={handleBulkAcknowledge} loading={bulkLoading}>
            Acknowledge {selected.length} selected
          </Button>
        )}
      </Space>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        loading={isLoading}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        rowSelection={
          canAcknowledge
            ? {
                selectedRowKeys: selected,
                onChange: (keys) => setSelected(keys as string[]),
                getCheckboxProps: (record) => ({
                  disabled: record.status !== 'open',
                }),
              }
            : undefined
        }
        expandable={{
          expandedRowRender: (record) => (
            <div>
              <Typography.Text strong>Alert context</Typography.Text>
              <pre style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
                {JSON.stringify(record.context ?? {}, null, 2)}
              </pre>
            </div>
          ),
          rowExpandable: (record) => Object.keys(record.context ?? {}).length > 0,
        }}
      />
    </div>
  );
}
