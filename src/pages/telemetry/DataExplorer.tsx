import { useState, useMemo } from 'react';
import { Table, Select, Form, InputNumber, Button, Space, Typography, Segmented, Checkbox } from 'antd';
import { TableOutlined, LineChartOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TimeRangePicker } from '@/components/TimeRangePicker';
import { useTagReads } from '@/hooks/useTagReads';
import { useDevices } from '@/hooks/useDevices';
import type { TagReadResponse } from '@/types';

const { Title } = Typography;

const EPC_SCHEMES = ['sgtin-96', 'sgtin-198', 'sscc-96', 'giai-96', 'giai-202', 'grai-96', 'grai-170', 'raw'];

const columns: ColumnsType<TagReadResponse> = [
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
    render: (v: string) => new Date(v).toLocaleString(),
    sorter: (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
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
];

export function DataExplorer() {
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
  const { data: rawData, isLoading } = useTagReads({ device_id: deviceId, tag_id: tagId, start, end, limit });

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
          pagination={{ pageSize: 20 }}
        />
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="signal" stroke="#1890ff" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
