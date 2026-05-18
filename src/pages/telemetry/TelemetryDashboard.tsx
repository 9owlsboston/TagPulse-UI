import { useState, useMemo } from 'react';
import Select from 'antd/es/select';
import Typography from 'antd/es/typography';
import Button from 'antd/es/button';
import { SearchOutlined } from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { TimeRangePicker } from '@/components/TimeRangePicker';
import { useReadsPerHour } from '@/hooks/useTagReads';
import { useDevices } from '@/hooks/useDevices';
import { useSSE } from '@/lib/sse';

const { Title } = Typography;

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'];
const SSE_EVENTS = ['tag_read.created'];
const SSE_KEYS = [['tag-reads']];

export function TelemetryDashboard() {
  const navigate = useNavigate();
  const [deviceId, setDeviceId] = useState<string | undefined>();
  const [start, setStart] = useState<string | undefined>();
  const [end, setEnd] = useState<string | undefined>();

  const { data: devices } = useDevices();
  const { data: readsPerHour, isLoading } = useReadsPerHour({ device_id: deviceId, start, end });

  useSSE(SSE_EVENTS, SSE_KEYS);

  const deviceOptions = useMemo(
    () => [
      { label: 'All Devices', value: '' },
      ...(devices ?? []).map((d) => ({ label: d.name, value: d.id })),
    ],
    [devices],
  );

  const deviceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of readsPerHour ?? []) ids.add(r.device_id);
    return Array.from(ids);
  }, [readsPerHour]);

  const chartData = useMemo(() => {
    const bucketMap = new Map<string, Record<string, number>>();
    for (const r of readsPerHour ?? []) {
      const key = new Date(r.bucket).toLocaleString();
      const entry = bucketMap.get(key) ?? {};
      entry[r.device_id] = r.read_count;
      bucketMap.set(key, entry);
    }
    return Array.from(bucketMap.entries()).map(([bucket, counts]) => ({
      bucket,
      ...counts,
    }));
  }, [readsPerHour]);

  const deviceNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of devices ?? []) map.set(d.id, d.name);
    return map;
  }, [devices]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Telemetry</Title>
        <Button icon={<SearchOutlined />} onClick={() => navigate('/telemetry/explore')}>
          Data Explorer
        </Button>
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <Select
          options={deviceOptions}
          value={deviceId ?? ''}
          onChange={(v) => setDeviceId(v || undefined)}
          style={{ width: 200 }}
          placeholder="Select device"
        />
        <TimeRangePicker onChange={(s, e) => { setStart(s); setEnd(e); }} />
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 8, right: 24, left: 16, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="bucket" />
          <YAxis
            allowDecimals={false}
            label={{ value: 'Reads / hour', angle: -90, position: 'insideLeft', offset: 0, style: { textAnchor: 'middle' } }}
          />
          <Tooltip formatter={(value: number) => [`${value} reads`, undefined]} />
          <Legend />
          {deviceIds.map((id, i) => (
            <Line
              key={id}
              type="monotone"
              dataKey={id}
              name={deviceNameMap.get(id) ?? id}
              stroke={COLORS[i % COLORS.length]}
              dot={false}
              isAnimationActive={!isLoading}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
