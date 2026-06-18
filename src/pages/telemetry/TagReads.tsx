import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import { useColumnGroup, useLabel, useTableConfig } from '@/lib/uiConfig';
import {
  applyColumnConfig,
  applyDefaultSort,
  chooserCandidates,
  columnKey,
  hasAdvancedColumns,
  type KeyedColumn,
} from '@/lib/columnConfig';
import { useColumnVisibility } from '@/lib/useColumnVisibility';
import { ColumnChooser, type ColumnChooserItem } from '@/components/ColumnChooser';
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

// Sprint 64 — Antenna / Temperature / Humidity. Temp & humidity live in the
// free-form `sensor_data` dict under *two* key conventions: real edge devices
// (wire-format v2) write `temperature_c` / `humidity_pct`; simulators & demo
// seeds write `temperature` / `humidity`. Resolve a fallback chain so both
// render, and reuse the same resolver for the render, sorter, and CSV export.
const asFiniteNumber = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;
const readTemperature = (r: TagReadResponse): number | undefined =>
  asFiniteNumber(r.sensor_data?.temperature) ?? asFiniteNumber(r.sensor_data?.temperature_c);
const readHumidity = (r: TagReadResponse): number | undefined =>
  asFiniteNumber(r.sensor_data?.humidity) ?? asFiniteNumber(r.sensor_data?.humidity_pct);

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
  const tableConfig = useTableConfig(TAG_READS_PAGE);
  const colVis = useColumnVisibility(TAG_READS_PAGE);
  const deviceLabel = useLabel('device');
  const devicesLabel = useLabel('device', { plural: true });
  const tagReadsLabel = useLabel('tagRead', { plural: true });

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
        // The raw wire-format EPC hex. Default-hidden via the system `columns`
        // config (ADR-032) so the readable decoded `EPC` URI is the default;
        // tenants that prefer the hex (e.g. RFID-only fleets) reveal it and
        // hide the URI via their `columns.tag_reads` preset or the chooser.
        title: 'EPC (hex)',
        key: 'epc_hex',
        dataIndex: 'epc_hex',
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
      { title: deviceLabel, key: 'device_id', dataIndex: 'device_id' },
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
        title: 'Antenna',
        key: 'reader_antenna',
        dataIndex: 'reader_antenna',
        render: (v: number | null | undefined) => v ?? '—',
        sorter: (a, b) => (a.reader_antenna ?? -Infinity) - (b.reader_antenna ?? -Infinity),
      },
      {
        // Free-form `sensor_data` — resolved via the temperature fallback chain
        // (real-device `temperature_c` vs simulator `temperature`), so no
        // `dataIndex`; sort uses the same resolver.
        title: 'Temp (°C)',
        key: 'sensor_temperature',
        render: (_v: unknown, row: TagReadResponse) => {
          const t = readTemperature(row);
          return t === undefined ? '—' : t.toFixed(1);
        },
        sorter: (a, b) => (readTemperature(a) ?? -Infinity) - (readTemperature(b) ?? -Infinity),
      },
      {
        title: 'Humidity (%)',
        key: 'sensor_humidity',
        render: (_v: unknown, row: TagReadResponse) => {
          const h = readHumidity(row);
          return h === undefined ? '—' : h.toFixed(1);
        },
        sorter: (a, b) => (readHumidity(a) ?? -Infinity) - (readHumidity(b) ?? -Infinity),
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
    [flashing, deviceLabel],
  );

  // Sprint 60 (ADR-032 §6.3) — apply the resolved `columns.tag_reads` leaf:
  // hide plumbing (TID / User Memory) behind the Advanced toggle by default,
  // plus any tenant-configured hidden/order/advanced. With no config and the
  // toggle off, only the default-advanced columns are dropped. A configured
  // `tables.tag_reads.defaultSort` then overrides the column's own default sort.
  const serverVisibleColumns = useMemo(
    () =>
      applyColumnConfig(columns, columnConfig, {
        defaultAdvanced: DEFAULT_ADVANCED_COLUMNS,
        showAdvanced,
      }),
    [columns, columnConfig, showAdvanced],
  );

  // Sprint 62 — the addressable columns the "Columns" chooser can toggle. Built
  // from the *full* column set (minus advanced) so a currently-hidden column
  // still appears (unchecked) and can be re-shown; the resolved `hidden` set
  // (Sprint 63: the cross-device user override) drives each checkbox.
  const chooserColumns = useMemo<ColumnChooserItem[]>(
    () =>
      chooserCandidates(columns, columnConfig, {
        defaultAdvanced: DEFAULT_ADVANCED_COLUMNS,
      })
        .map((c) => ({ key: columnKey(c as KeyedColumn), label: (c as { title?: ReactNode }).title }))
        .filter((c): c is ColumnChooserItem => c.key !== undefined),
    [columns, columnConfig],
  );

  // The rendered table = server-resolved visible columns (which now include the
  // user's cross-device hides) with the config-driven default sort applied.
  const visibleColumns = useMemo(
    () => applyDefaultSort(serverVisibleColumns, tableConfig.defaultSort),
    [serverVisibleColumns, tableConfig.defaultSort],
  );

  const advancedColumnsAvailable = useMemo(
    () => hasAdvancedColumns(columns, columnConfig, DEFAULT_ADVANCED_COLUMNS),
    [columns, columnConfig],
  );

  const deviceOptions = useMemo(
    () => [
      { label: `All ${devicesLabel}`, value: '' },
      ...(devices ?? []).map((d) => ({ label: d.name, value: d.id })),
    ],
    [devices, devicesLabel],
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
      { header: 'user_memory_hex', accessor: (r) => r.user_memory_hex },
      { header: 'device_id', accessor: (r) => r.device_id },
      { header: 'timestamp', accessor: (r) => r.timestamp },
      { header: 'signal_strength', accessor: (r) => r.signal_strength },
      { header: 'reader_antenna', accessor: (r) => r.reader_antenna },
      { header: 'temperature_c', accessor: (r) => readTemperature(r) },
      { header: 'humidity_pct', accessor: (r) => readHumidity(r) },
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
      <Title level={2}>{tagReadsLabel}</Title>
      <Form layout="inline" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Form.Item label={deviceLabel}>
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
          {viewMode === 'table' && (
            <ColumnChooser
              columns={chooserColumns}
              hidden={colVis.hidden}
              onToggle={colVis.setColumnVisible}
              onShowAll={colVis.showAll}
              onResetToTeamDefault={colVis.resetToTeamDefault}
              busy={colVis.isSaving}
            />
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
            pagination={{
              // `defaultPageSize` (uncontrolled) lets AntD own the page size so
              // the size changer actually takes effect — a literal `pageSize`
              // is *controlled* and reverts every selection back on re-render.
              defaultPageSize: 20,
              showSizeChanger: true,
              pageSizeOptions: [20, 50, 100],
            }}
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
