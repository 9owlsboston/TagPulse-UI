import { useEffect, useMemo, useRef, useState } from 'react';
import Table from 'antd/es/table';
import Select from 'antd/es/select';
import Form from 'antd/es/form';
import InputNumber from 'antd/es/input-number';
import Button from 'antd/es/button';
import Space from 'antd/es/space';
import Typography from 'antd/es/typography';
import Segmented from 'antd/es/segmented';
import Checkbox from 'antd/es/checkbox';
import { TableOutlined, LineChartOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { TimeRangePicker } from '@/components/TimeRangePicker';
import { TpLineChart, type TpSeries } from '@/components/charts/TpLineChart';
import { useTagReads } from '@/hooks/useTagReads';
import { useDevices } from '@/hooks/useDevices';
import { useColumnGroup } from '@/lib/uiConfig';
import { applyColumnConfig, hasAdvancedColumns } from '@/lib/columnConfig';
import { useSSE } from '@/lib/sse';
import { REFETCH_INTERVAL } from '@/lib/constants';
import { downloadCsv, toCsv, type CsvColumn } from '@/lib/chartExport';
import type { TagReadResponse } from '@/types';

const { Title } = Typography;

const EPC_SCHEMES = ['sgtin-96', 'sgtin-198', 'sscc-96', 'giai-96', 'giai-202', 'grai-96', 'grai-170', 'raw'];

// Stock-ticker style row-flash, mirrors AssetList. Cap how many rows can
// flash per refresh so a burst doesn't strobe the whole table.
const MAX_FLASHES_PER_REFRESH = 12;
const FLASH_DURATION_MS = 900;
const SSE_EVENTS = ['tag_read.created'];
const SSE_KEYS = [['tag-reads']];

const SIGNAL_SERIES: TpSeries[] = [{ key: 'signal', label: 'Signal' }];

// Sprint 57 Phase D — virtualize the table once filtered rows exceed this
// threshold. Below the threshold we keep the paginated layout so the
// typical small-result UX is unchanged; above it we switch to a single
// scroll viewport so high-`limit` exploratory queries don't render
// thousands of DOM nodes.
const VIRTUAL_ROW_THRESHOLD = 500;
const VIRTUAL_SCROLL_HEIGHT = 480;

// Sprint 60 (ADR-032 §6.3) — the plumbing identity columns hidden behind the
// "Advanced columns" toggle by default. `tid` (factory tag serial) and
// `user_memory_hex` (raw user-memory bank) are meaningless to a non-technical
// operator; the config `columns.tag_reads.advanced` may extend this set, and
// `columns.tag_reads.hidden` / `.order` further tailor the table per tenant.
const TAG_READS_PAGE = 'tag_reads';
const DEFAULT_ADVANCED_COLUMNS = ['tid', 'user_memory_hex'];

export function TagReads() {
  const [deviceId, setDeviceId] = useState<string | undefined>();
  const [tagId, setTagId] = useState<string | undefined>();
  const [start, setStart] = useState<string | undefined>();
  const [end, setEnd] = useState<string | undefined>();
  const [limit, setLimit] = useState(100);
  const [signalMin, setSignalMin] = useState<number | undefined>();
  const [signalMax, setSignalMax] = useState<number | undefined>();
  const [hasLocation, setHasLocation] = useState(false);
  const [epcScheme, setEpcScheme] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const columnConfig = useColumnGroup(TAG_READS_PAGE);

  const { data: devices } = useDevices();
  const { data: rawData, isLoading } = useTagReads(
    { device_id: deviceId, tag_id: tagId, start, end, limit },
    { refetchInterval: REFETCH_INTERVAL },
  );

  // Auto-refresh on new tag reads pushed via SSE (polling above is the
  // fallback when EventSource can't carry the JWT header).
  useSSE(SSE_EVENTS, SSE_KEYS);

  const data = useMemo(() => {
    if (!rawData) return rawData;
    return rawData.filter((r) => {
      if (signalMin !== undefined && (r.signal_strength === null || r.signal_strength < signalMin)) return false;
      if (signalMax !== undefined && (r.signal_strength === null || r.signal_strength > signalMax)) return false;
      if (hasLocation && (r.latitude == null || r.longitude == null)) return false;
      if (epcScheme && r.epc_scheme !== epcScheme) return false;
      return true;
    });
  }, [rawData, signalMin, signalMax, hasLocation, epcScheme]);

  // ── Row-flash on new read ─────────────────────────────────────────────
  // Track ids seen in previous payloads; new ids since the last refresh
  // flash green for FLASH_DURATION_MS. First payload is just seeded so
  // we don't strobe the whole table on initial mount.
  const seenIdsRef = useRef<Set<string>>(new Set());
  const flashTimersRef = useRef<Map<string, number>>(new Map());
  const seededRef = useRef(false);
  const [flashing, setFlashing] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!rawData) return;
    if (!seededRef.current) {
      for (const r of rawData) seenIdsRef.current.add(r.id);
      seededRef.current = true;
      return;
    }
    const fresh: string[] = [];
    for (const r of rawData) {
      if (!seenIdsRef.current.has(r.id)) {
        fresh.push(r.id);
        seenIdsRef.current.add(r.id);
      }
    }
    if (fresh.length === 0) return;
    const toFlash = fresh.slice(0, MAX_FLASHES_PER_REFRESH);
    setFlashing((prev) => {
      const next = new Set(prev);
      for (const id of toFlash) next.add(id);
      return next;
    });
    for (const id of toFlash) {
      const existing = flashTimersRef.current.get(id);
      if (existing) window.clearTimeout(existing);
      const t = window.setTimeout(() => {
        setFlashing((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        flashTimersRef.current.delete(id);
      }, FLASH_DURATION_MS);
      flashTimersRef.current.set(id, t);
    }
  }, [rawData]);

  useEffect(
    () => () => {
      for (const t of flashTimersRef.current.values()) window.clearTimeout(t);
    },
    [],
  );

  const columns = useMemo<ColumnsType<TagReadResponse>>(
    () => [
      { title: 'Tag ID', key: 'tag_id', dataIndex: 'tag_id' },
      {
        title: 'EPC',
        key: 'epc',
        dataIndex: 'epc',
        render: (v: string | null | undefined) => v ?? '—',
      },
      {
        title: 'Scheme',
        key: 'epc_scheme',
        dataIndex: 'epc_scheme',
        render: (v: string | null | undefined) => v ?? '—',
      },
      {
        title: 'TID',
        key: 'tid',
        dataIndex: 'tid',
        render: (v: string | null | undefined) => v ?? '—',
      },
      {
        title: 'User Memory',
        key: 'user_memory_hex',
        dataIndex: 'user_memory_hex',
        render: (v: string | null | undefined) => v ?? '—',
      },
      { title: 'Device', key: 'device_id', dataIndex: 'device_id' },
      {
        title: 'Timestamp',
        key: 'timestamp',
        dataIndex: 'timestamp',
        sorter: (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        render: (v: string, row: TagReadResponse) => {
          const isFlashing = flashing.has(row.id);
          return (
            <span key={v} className={isFlashing ? 'tagpulse-cell-pop' : undefined}>
              {new Date(v).toLocaleString()}
            </span>
          );
        },
      },
      {
        title: 'Signal',
        key: 'signal_strength',
        dataIndex: 'signal_strength',
        render: (v: number | null) => v ?? '—',
      },
      {
        title: 'Latitude',
        key: 'latitude',
        dataIndex: 'latitude',
        render: (v: number | null | undefined) => (v == null ? '—' : v.toFixed(5)),
      },
      {
        title: 'Longitude',
        key: 'longitude',
        dataIndex: 'longitude',
        render: (v: number | null | undefined) => (v == null ? '—' : v.toFixed(5)),
      },
    ],
    [flashing],
  );

  // Sprint 60 (ADR-032 §6.3) — apply the resolved `columns.tag_reads` leaf:
  // hide plumbing (TID / User Memory) behind the Advanced toggle by default,
  // plus any tenant-configured hidden/order/advanced. With no config and the
  // toggle off, only the default-advanced columns are dropped.
  const visibleColumns = useMemo(
    () =>
      applyColumnConfig(columns, columnConfig, {
        defaultAdvanced: DEFAULT_ADVANCED_COLUMNS,
        showAdvanced,
      }),
    [columns, columnConfig, showAdvanced],
  );

  const advancedColumnsAvailable = useMemo(
    () => hasAdvancedColumns(columns, columnConfig, DEFAULT_ADVANCED_COLUMNS),
    [columns, columnConfig],
  );

  const deviceOptions = useMemo(
    () => [
      { label: 'All Devices', value: '' },
      ...(devices ?? []).map((d) => ({ label: d.name, value: d.id })),
    ],
    [devices],
  );

  const epcSchemeOptions = useMemo(
    () => [
      { label: 'Any scheme', value: '' },
      ...EPC_SCHEMES.map((s) => ({ label: s, value: s })),
    ],
    [],
  );

  const chartData = useMemo(
    () => (data ?? []).map((r) => ({
      time: r.timestamp,
      signal: r.signal_strength ?? 0,
    })),
    [data],
  );

  const isVirtual = (data?.length ?? 0) > VIRTUAL_ROW_THRESHOLD;

  const handleExportCsv = () => {
    if (!data?.length) return;
    const columns: CsvColumn<TagReadResponse>[] = [
      { header: 'tag_id', accessor: (r) => r.tag_id },
      { header: 'epc', accessor: (r) => r.epc },
      { header: 'epc_scheme', accessor: (r) => r.epc_scheme },
      { header: 'tid', accessor: (r) => r.tid },
      { header: 'device_id', accessor: (r) => r.device_id },
      { header: 'timestamp', accessor: (r) => r.timestamp },
      { header: 'signal_strength', accessor: (r) => r.signal_strength },
      { header: 'latitude', accessor: (r) => r.latitude },
      { header: 'longitude', accessor: (r) => r.longitude },
      { header: 'location_accuracy_m', accessor: (r) => r.location_accuracy_m },
      { header: 'location_source', accessor: (r) => r.location_source },
    ];
    downloadCsv('tag-reads.csv', toCsv(data, columns));
  };

  return (
    <div>
      <style>{`
        @keyframes tagpulse-row-flash {
          0%   { background-color: rgba(82, 196, 26, 0.28); }
          60%  { background-color: rgba(82, 196, 26, 0.14); }
          100% { background-color: transparent; }
        }
        .tagpulse-row-flash > td {
          animation: tagpulse-row-flash ${FLASH_DURATION_MS}ms ease-out;
        }
        @keyframes tagpulse-cell-pop {
          0%   { transform: scale(1); color: var(--color-success); font-weight: 600; }
          40%  { transform: scale(1.06); color: var(--color-success); font-weight: 600; }
          100% { transform: scale(1); color: inherit; font-weight: inherit; }
        }
        .tagpulse-cell-pop {
          display: inline-block;
          animation: tagpulse-cell-pop ${FLASH_DURATION_MS}ms ease-out;
          transform-origin: left center;
        }
        @media (prefers-reduced-motion: reduce) {
          .tagpulse-row-flash > td,
          .tagpulse-cell-pop { animation: none; }
        }
      `}</style>
      <Title level={2}>Tag Reads</Title>
      <Form layout="inline" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Form.Item label="Device">
          <Select
            options={deviceOptions}
            value={deviceId ?? ''}
            onChange={(v) => setDeviceId(v || undefined)}
            style={{ width: 200 }}
          />
        </Form.Item>
        <Form.Item label="Tag ID">
          <Select
            mode="tags"
            placeholder="Filter by tag"
            style={{ width: 200 }}
            onChange={(v: string[]) => setTagId(v[0] || undefined)}
          />
        </Form.Item>
        <Form.Item label="EPC Scheme">
          <Select
            options={epcSchemeOptions}
            value={epcScheme ?? ''}
            onChange={(v) => setEpcScheme(v || undefined)}
            style={{ width: 140 }}
          />
        </Form.Item>
        <Form.Item label="Signal Min">
          <InputNumber value={signalMin} onChange={(v) => setSignalMin(v ?? undefined)} style={{ width: 100 }} />
        </Form.Item>
        <Form.Item label="Signal Max">
          <InputNumber value={signalMax} onChange={(v) => setSignalMax(v ?? undefined)} style={{ width: 100 }} />
        </Form.Item>
        <Form.Item label="Limit">
          <InputNumber min={1} max={1000} value={limit} onChange={(v) => setLimit(v ?? 100)} />
        </Form.Item>
        <Form.Item>
          <Checkbox checked={hasLocation} onChange={(e) => setHasLocation(e.target.checked)}>
            Has location
          </Checkbox>
        </Form.Item>
      </Form>
      <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap' }}>
        <Space wrap>
          <TimeRangePicker onChange={(s, e) => { setStart(s); setEnd(e); }} />
          {viewMode === 'table' && (
            <Button
              onClick={handleExportCsv}
              disabled={!data?.length}
              data-testid="tag-reads-export-rows-csv"
            >
              Export rows CSV
            </Button>
          )}
          {viewMode === 'table' && advancedColumnsAvailable && (
            <Checkbox
              checked={showAdvanced}
              onChange={(e) => setShowAdvanced(e.target.checked)}
              data-testid="tag-reads-advanced-columns-toggle"
            >
              Advanced columns
            </Checkbox>
          )}
        </Space>
        <Segmented
          options={[
            { label: <><TableOutlined /> Table</>, value: 'table' },
            { label: <><LineChartOutlined /> Chart</>, value: 'chart' },
          ]}
          value={viewMode}
          onChange={(v) => setViewMode(v as 'table' | 'chart')}
        />
      </Space>
      {viewMode === 'table' ? (
        isVirtual ? (
          <Table
            rowKey="id"
            columns={visibleColumns}
            dataSource={data}
            loading={isLoading}
            rowClassName={(row) => (flashing.has(row.id) ? 'tagpulse-row-flash' : '')}
            virtual
            scroll={{ y: VIRTUAL_SCROLL_HEIGHT, x: 1200 }}
            pagination={false}
            data-testid="tag-reads-table-virtual"
          />
        ) : (
          <Table
            rowKey="id"
            columns={visibleColumns}
            dataSource={data}
            loading={isLoading}
            rowClassName={(row) => (flashing.has(row.id) ? 'tagpulse-row-flash' : '')}
            pagination={{ pageSize: 20 }}
            data-testid="tag-reads-table-paginated"
          />
        )
      ) : (
        <TpLineChart
          data={chartData}
          series={SIGNAL_SERIES}
          xKey="time"
          height={400}
          yLabel="Signal strength (dBm)"
          loading={isLoading}
          ariaLabel="Signal strength over time"
          exportFileName="tag-reads"
          showExport
          syncId="tag-reads"
          enableBrush
        />
      )}
    </div>
  );
}
