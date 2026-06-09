import { useState, useMemo } from 'react';
import Select from 'antd/es/select';
import Typography from 'antd/es/typography';
import Button from 'antd/es/button';
import { SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { TimeRangePicker } from '@/components/TimeRangePicker';
import { TpLineChart, type TpSeries } from '@/components/charts/TpLineChart';
import { useReadsPerHour } from '@/hooks/useTagReads';
import { useDevices } from '@/hooks/useDevices';
import { useSSE } from '@/lib/sse';

const { Title } = Typography;

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
      const entry = bucketMap.get(r.bucket) ?? {};
      entry[r.device_id] = r.read_count;
      bucketMap.set(r.bucket, entry);
    }
    return Array.from(bucketMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bucket, counts]) => ({ bucket, ...counts }));
  }, [readsPerHour]);

  const deviceNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of devices ?? []) map.set(d.id, d.name);
    return map;
  }, [devices]);

  const series = useMemo<TpSeries[]>(
    () => deviceIds.map((id) => ({ key: id, label: deviceNameMap.get(id) ?? id })),
    [deviceIds, deviceNameMap],
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Telemetry</Title>
        <Button icon={<SearchOutlined />} onClick={() => navigate('/tag-reads')}>
          Tag Reads
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
      <TpLineChart
        data={chartData}
        series={series}
        xKey="bucket"
        height={400}
        yLabel="Reads / hour"
        loading={isLoading}
        ariaLabel="Reads per device over time"
        showExport
        exportFileName="telemetry-reads"
        syncId="telemetry-dashboard"
        enableBrush
      />
    </div>
  );
}
