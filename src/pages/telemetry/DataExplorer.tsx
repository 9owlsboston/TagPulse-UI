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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TimeRangePicker } from '@/components/TimeRangePicker';
import { useTagReads } from '@/hooks/useTagReads';
import { useDevices } from '@/hooks/useDevices';
import { useSSE } from '@/lib/sse';
import { REFETCH_INTERVAL } from '@/lib/constants';
import { useThemeMode } from '@/theme/ThemeProvider';
import { tokens } from '@/theme/tokens';
import type { TagReadResponse } from '@/types';

const { Title } = Typography;

const EPC_SCHEMES = ['sgtin-96', 'sgtin-198', 'sscc-96', 'giai-96', 'giai-202', 'grai-96', 'grai-170', 'raw'];

// Stock-ticker style row-flash, mirrors AssetList. Cap how many rows can
// flash per refresh so a burst doesn't strobe the whole table.
const MAX_FLASHES_PER_REFRESH = 12;
const FLASH_DURATION_MS = 900;
const SSE_EVENTS = ['tag_read.created'];
const SSE_KEYS = [['tag-reads']];

export function DataExplorer() {
  const { mode } = useThemeMode();
  const t = tokens[mode];
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
      { title: 'Tag ID', dataIndex: 'tag_id' },
      { title: 'EPC', dataIndex: 'epc', render: (v: string | null | undefined) => v ?? '—' },
      {
        title: 'Scheme',
        dataIndex: 'epc_scheme',
        render: (v: string | null | undefined) => v ?? '—',
      },
      { title: 'TID', dataIndex: 'tid', render: (v: string | null | undefined) => v ?? '—' },
      { title: 'Device', dataIndex: 'device_id' },
      {
        title: 'Timestamp',
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
      { title: 'Signal', dataIndex: 'signal_strength', render: (v: number | null) => v ?? '—' },
      {
        title: 'Latitude',
        dataIndex: 'latitude',
        render: (v: number | null | undefined) => (v == null ? '—' : v.toFixed(5)),
      },
      {
        title: 'Longitude',
        dataIndex: 'longitude',
        render: (v: number | null | undefined) => (v == null ? '—' : v.toFixed(5)),
      },
    ],
    [flashing],
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
      time: new Date(r.timestamp).toLocaleString(),
      signal: r.signal_strength ?? 0,
    })),
    [data],
  );

  const handleExportCsv = () => {
    if (!data?.length) return;
    const headers = [
      'tag_id',
      'epc',
      'epc_scheme',
      'tid',
      'device_id',
      'timestamp',
      'signal_strength',
      'latitude',
      'longitude',
      'location_accuracy_m',
      'location_source',
    ];
    const escape = (v: unknown): string => {
      if (v == null) return '';
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = data.map((r) =>
      [
        r.tag_id,
        r.epc ?? '',
        r.epc_scheme ?? '',
        r.tid ?? '',
        r.device_id,
        r.timestamp,
        r.signal_strength ?? '',
        r.latitude ?? '',
        r.longitude ?? '',
        r.location_accuracy_m ?? '',
        r.location_source ?? '',
      ]
        .map(escape)
        .join(','),
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tag-reads.csv';
    a.click();
    URL.revokeObjectURL(url);
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
      <Title level={2}>Data Explorer</Title>
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
      <Space style={{ marginBottom: 16 }}>
        <TimeRangePicker onChange={(s, e) => { setStart(s); setEnd(e); }} />
        <Segmented
          options={[
            { label: <><TableOutlined /> Table</>, value: 'table' },
            { label: <><LineChartOutlined /> Chart</>, value: 'chart' },
          ]}
          value={viewMode}
          onChange={(v) => setViewMode(v as 'table' | 'chart')}
        />
        <Button onClick={handleExportCsv} disabled={!data?.length}>Export CSV</Button>
      </Space>
      {viewMode === 'table' ? (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={isLoading}
          rowClassName={(row) => (flashing.has(row.id) ? 'tagpulse-row-flash' : '')}
          pagination={{ pageSize: 20 }}
        />
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 8, right: 24, left: 16, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis
              label={{ value: 'Signal strength (dBm)', angle: -90, position: 'insideLeft', offset: 0, style: { textAnchor: 'middle' } }}
            />
            <Tooltip formatter={(value: number) => [`${value} dBm`, 'Signal']} />
            <Line type="monotone" dataKey="signal" stroke={t.colorAccent} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
